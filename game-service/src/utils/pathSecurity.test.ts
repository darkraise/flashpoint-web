import { describe, it, expect } from 'vitest';
import path from 'path';
import {
  sanitizeAndValidatePath,
  validatePathInAllowedDirectories,
  sanitizeUrlPath,
  hasDoubleEncoding,
  sanitizeErrorMessage,
} from './pathSecurity';

describe('pathSecurity', () => {
  describe('sanitizeAndValidatePath', () => {
    const basePath = path.resolve('/var/www/htdocs');

    it('should allow valid paths within base directory', () => {
      const result = sanitizeAndValidatePath(basePath, 'files/game.swf');
      expect(result).toContain('htdocs');
      expect(result).toContain('files');
      expect(result).toContain('game.swf');
    });

    it('should allow paths with subdirectories', () => {
      const result = sanitizeAndValidatePath(basePath, 'folder/subfolder/file.html');
      expect(result).toContain('htdocs');
      expect(result).toContain('folder');
      expect(result).toContain('subfolder');
    });

    it('should normalize redundant separators', () => {
      const result = sanitizeAndValidatePath(basePath, 'files//game.swf');
      expect(result).not.toContain('//');
    });

    it('should block directory traversal with ../', () => {
      expect(() => {
        sanitizeAndValidatePath(basePath, '../../../etc/passwd');
      }).toThrow('Directory traversal detected');
    });

    it('should block directory traversal with absolute paths', () => {
      expect(() => {
        sanitizeAndValidatePath(basePath, '/etc/passwd');
      }).toThrow('Directory traversal detected');
    });

    it('should block directory traversal in middle of path', () => {
      expect(() => {
        sanitizeAndValidatePath(basePath, 'files/../../etc/passwd');
      }).toThrow('Directory traversal detected');
    });

    it('should allow safe use of .. within base directory', () => {
      // This should work: /var/www/htdocs/files/../other -> /var/www/htdocs/other
      const result = sanitizeAndValidatePath(basePath, 'files/../other/game.swf');
      expect(result).toContain('htdocs');
      expect(result).toContain('other');
      expect(result).not.toContain('files');
    });
  });

  describe('validatePathInAllowedDirectories', () => {
    const allowedBases = [path.resolve('/var/www/htdocs'), path.resolve('/var/www/cgi-bin')];

    it('should allow paths in first base directory', () => {
      const result = validatePathInAllowedDirectories(allowedBases, 'files/game.swf');
      expect(result).toContain('htdocs');
    });

    it('should allow paths in second base directory', () => {
      // Note: This will try htdocs first, fail, then try cgi-bin
      const result = validatePathInAllowedDirectories(
        allowedBases,
        path.join(allowedBases[1], 'script.php')
      );
      expect(result).toContain('cgi-bin');
    });

    it('should block paths not in any allowed directory', () => {
      expect(() => {
        validatePathInAllowedDirectories(allowedBases, '../../../etc/passwd');
      }).toThrow('Not in any allowed directory');
    });
  });

  describe('sanitizeUrlPath', () => {
    it('should allow normal URL paths', () => {
      const result = sanitizeUrlPath('/path/to/file.swf');
      expect(result).toBe('/path/to/file.swf');
    });

    it('should allow paths with query strings', () => {
      const result = sanitizeUrlPath('/file.swf?token=xyz');
      expect(result).toBe('/file.swf?token=xyz');
    });

    it('should block null bytes', () => {
      expect(() => {
        sanitizeUrlPath('/file.swf\0.txt');
      }).toThrow('Null byte detected');
    });

    it('should block URL encoded directory traversal (../)', () => {
      expect(() => {
        sanitizeUrlPath('/path/..%2F..%2F..%2Fetc/passwd');
      }).toThrow('Dangerous pattern detected');
    });

    it('should block URL encoded directory traversal (..\\)', () => {
      expect(() => {
        sanitizeUrlPath('/path/..%5C..%5C..%5Cetc/passwd');
      }).toThrow('Dangerous pattern detected');
    });

    it('should block backslash path traversal', () => {
      expect(() => {
        sanitizeUrlPath('/path/..\\..\\..\\etc/passwd');
      }).toThrow('Dangerous pattern detected');
    });

    it('should allow normal .. in paths (will be validated by sanitizeAndValidatePath)', () => {
      const result = sanitizeUrlPath('/files/../other/game.swf');
      expect(result).toBe('/files/../other/game.swf');
    });

    it('should block double-encoded traversal (%252e%252e)', () => {
      expect(() => {
        sanitizeUrlPath('/path/%252e%252e/etc/passwd');
      }).toThrow('Double encoding detected');
    });

    it('should block double-encoded forward slash (%252f)', () => {
      expect(() => {
        sanitizeUrlPath('/path/%252f..%252fetc/passwd');
      }).toThrow('Double encoding detected');
    });

    it('should block URL encoded null bytes (%00)', () => {
      expect(() => {
        sanitizeUrlPath('/file.swf%00.txt');
      }).toThrow('Dangerous pattern detected');
    });

    it('should block malformed URL encoding', () => {
      expect(() => {
        sanitizeUrlPath('/path/%GG/file.swf');
      }).toThrow('Malformed URL encoding');
    });
  });

  describe('hasDoubleEncoding', () => {
    it('should detect double-encoded dot (%252e)', () => {
      expect(hasDoubleEncoding('%252e%252e')).toBe(true);
    });

    it('should detect double-encoded forward slash (%252f)', () => {
      expect(hasDoubleEncoding('%252f')).toBe(true);
    });

    it('should detect double-encoded backslash (%255c)', () => {
      expect(hasDoubleEncoding('%255c')).toBe(true);
    });

    it('should detect double-encoded null byte (%2500)', () => {
      expect(hasDoubleEncoding('%2500')).toBe(true);
    });

    it('should not flag single-encoded sequences', () => {
      expect(hasDoubleEncoding('%2e%2e')).toBe(false);
    });

    it('should not flag normal paths', () => {
      expect(hasDoubleEncoding('/path/to/file.swf')).toBe(false);
    });
  });

  describe('sanitizeErrorMessage', () => {
    it('should redact Windows paths', () => {
      const result = sanitizeErrorMessage('File not found: C:\\Users\\admin\\secrets.txt');
      expect(result).not.toContain('C:\\Users');
      expect(result).toContain('[path]');
    });

    it('should redact Unix paths', () => {
      const result = sanitizeErrorMessage('Cannot access /home/user/private/file.txt');
      expect(result).not.toContain('/home/user');
      expect(result).toContain('[path]');
    });

    it('should redact network paths', () => {
      const result = sanitizeErrorMessage('Error accessing \\\\server\\share\\file.txt');
      expect(result).not.toContain('\\\\server');
      expect(result).toContain('[path]');
    });

    it('should preserve non-path content', () => {
      const result = sanitizeErrorMessage('Connection timeout after 5000ms');
      expect(result).toBe('Connection timeout after 5000ms');
    });

    it('should handle multiple paths in one message', () => {
      const result = sanitizeErrorMessage('Copy from C:\\source\\file.txt to D:\\dest\\file.txt');
      expect(result).not.toContain('C:\\source');
      expect(result).not.toContain('D:\\dest');
      expect(result.match(/\[path\]/g)?.length).toBe(2);
    });
  });
});
