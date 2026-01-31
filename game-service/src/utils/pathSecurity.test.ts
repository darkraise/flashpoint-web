import { describe, it, expect } from 'vitest';
import path from 'path';
import { sanitizeAndValidatePath, validatePathInAllowedDirectories, sanitizeUrlPath } from './pathSecurity';

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
    const allowedBases = [
      path.resolve('/var/www/htdocs'),
      path.resolve('/var/www/cgi-bin'),
    ];

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
  });
});
