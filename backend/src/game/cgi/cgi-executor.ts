import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { logger } from '../../utils/logger';
import { sanitizeAndValidatePath } from '../utils/pathSecurity';

/**
 * CGI Request representation
 */
export interface CgiRequest {
  method: string;
  url: URL;
  headers: Record<string, string>;
  body?: Buffer;
}

/**
 * CGI Response representation
 */
export interface CgiResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: Buffer;
}

/**
 * CGI Executor configuration
 */
export interface CgiExecutorConfig {
  /** Path to php-cgi executable */
  phpCgiPath: string;
  /** Document root (htdocs path) */
  documentRoot: string;
  /** CGI-BIN path for script validation */
  cgiBinPath: string;
  /** Execution timeout in milliseconds (default: 30000) */
  timeout: number;
  /** Maximum request body size in bytes (default: 10MB) */
  maxBodySize: number;
  /** Maximum response size in bytes (default: 50MB) */
  maxResponseSize: number;
}

/**
 * Allowed environment variables to pass to CGI scripts
 */
const ALLOWED_ENV_VARS = [
  'PATH',
  'TEMP',
  'TMP',
  'SYSTEMROOT',
  'COMSPEC',
  'WINDIR',
  'HOME',
  'LANG',
  'LC_ALL',
];

/**
 * Allowed HTTP headers to pass to CGI scripts
 */
const ALLOWED_CGI_HEADERS = new Set([
  'host',
  'user-agent',
  'accept',
  'accept-language',
  'accept-encoding',
  'accept-charset',
  'cookie',
  'referer',
  'origin',
  'if-modified-since',
  'if-none-match',
  'cache-control',
  'pragma',
]);

/**
 * CGI Executor - Executes PHP scripts via php-cgi
 *
 * Implements CGI/1.1 specification (RFC 3875) for executing PHP scripts
 * in a secure manner with proper environment setup and output parsing.
 */
export class CgiExecutor {
  private config: CgiExecutorConfig;

  constructor(config: CgiExecutorConfig) {
    this.config = config;
  }

  /**
   * Validate that php-cgi binary exists and is executable
   */
  async validateBinary(): Promise<boolean> {
    try {
      await fs.access(this.config.phpCgiPath, fs.constants.X_OK);
      logger.info(`[CGI] PHP-CGI binary validated: ${this.config.phpCgiPath}`);
      return true;
    } catch (error) {
      logger.error(`[CGI] PHP-CGI binary not found or not executable: ${this.config.phpCgiPath}`);
      return false;
    }
  }

  /**
   * Execute a CGI script and return the response
   *
   * @param scriptPath - Absolute path to the script file
   * @param request - The incoming HTTP request
   * @returns CGI response with status code, headers, and body
   * @throws Error if execution fails or times out
   */
  async execute(scriptPath: string, request: CgiRequest): Promise<CgiResponse> {
    // Validate script path is within allowed directories (resolves symlinks)
    await this.validateScriptPath(scriptPath);

    // Build CGI environment variables
    const env = this.buildCgiEnvironment(scriptPath, request);

    logger.info(`[CGI] Executing: ${scriptPath}`);
    logger.debug(`[CGI] Method: ${request.method}, Query: ${request.url.search}`);

    return new Promise<CgiResponse>((resolve, reject) => {
      // Spawn php-cgi process with script path as explicit argument (CVE-2012-1823 mitigation)
      const proc = spawn(this.config.phpCgiPath, [scriptPath], {
        cwd: path.dirname(scriptPath),
        env: { ...this.sanitizeProcessEnv(), ...env },
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: this.config.timeout,
        windowsHide: true, // Hide console window on Windows
      });

      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      let stdoutSize = 0;
      let stderrSize = 0;
      let timedOut = false;
      let processExited = false;
      let forceKillHandle: NodeJS.Timeout | null = null;

      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        logger.warn(`[CGI] Script execution timed out after ${this.config.timeout}ms`);
        proc.kill('SIGTERM');

        // Force kill after 5 seconds if still running
        forceKillHandle = setTimeout(() => {
          if (!processExited) {
            proc.kill('SIGKILL');
          }
        }, 5000);
      }, this.config.timeout);

      // Handle stdout
      proc.stdout.on('data', (chunk: Buffer) => {
        stdoutSize += chunk.length;
        if (stdoutSize > this.config.maxResponseSize) {
          logger.error('[CGI] Response size exceeded maximum allowed');
          proc.kill('SIGTERM');
          return;
        }
        stdout.push(chunk);
      });

      // Handle stderr (for logging)
      proc.stderr.on('data', (chunk: Buffer) => {
        stderrSize += chunk.length;
        // Limit stderr collection to prevent memory issues
        if (stderrSize <= 1024 * 1024) {
          // 1MB max for stderr
          stderr.push(chunk);
        }
      });

      // Handle process completion
      proc.on('close', (code, signal) => {
        processExited = true;
        clearTimeout(timeoutHandle);
        if (forceKillHandle) {
          clearTimeout(forceKillHandle);
        }

        // Log stderr if present
        if (stderr.length > 0) {
          const stderrOutput = Buffer.concat(stderr).toString('utf-8');
          if (stderrOutput.trim()) {
            logger.warn(`[CGI] Script stderr: ${stderrOutput.substring(0, 500)}`);
          }
        }

        if (timedOut) {
          reject(new Error('CGI script execution timed out'));
          return;
        }

        if (signal) {
          reject(new Error(`CGI process terminated by signal: ${signal}`));
          return;
        }

        if (code !== 0 && code !== null) {
          logger.warn(`[CGI] Script exited with code: ${code}`);
        }

        try {
          const output = Buffer.concat(stdout);
          const response = this.parseCgiOutput(output);
          logger.info(
            `[CGI] Execution complete: ${response.statusCode} (${response.body.length} bytes)`
          );
          resolve(response);
        } catch (parseError) {
          reject(parseError);
        }
      });

      // Handle process errors
      proc.on('error', (error) => {
        processExited = true;
        clearTimeout(timeoutHandle);
        if (forceKillHandle) {
          clearTimeout(forceKillHandle);
        }
        logger.error(`[CGI] Process error: ${error.message}`);
        reject(new Error(`Failed to execute CGI script: ${error.message}`));
      });

      // Write request body to stdin
      if (request.body && request.body.length > 0) {
        proc.stdin.write(request.body);
      }
      proc.stdin.end();
    });
  }

  /**
   * Validate that the script path is within allowed directories
   * Resolves symlinks to prevent bypass attacks
   */
  private async validateScriptPath(scriptPath: string): Promise<void> {
    let realPath: string;
    try {
      realPath = await fs.realpath(scriptPath);
    } catch {
      throw new Error('CGI script not found');
    }

    // Script must be in either htdocs or cgi-bin
    try {
      sanitizeAndValidatePath(this.config.documentRoot, realPath);
      return;
    } catch {
      // Not in htdocs, try cgi-bin
    }

    try {
      sanitizeAndValidatePath(this.config.cgiBinPath, realPath);
      return;
    } catch {
      // Not in cgi-bin either
    }

    logger.error(`[CGI] Script path validation failed: ${scriptPath}`);
    throw new Error('CGI script path is not within allowed directories');
  }

  /**
   * Sanitize query string to prevent CVE-2012-1823 argument injection.
   * Rejects query strings that contain segments starting with '-' without '='
   * which php-cgi may interpret as command-line arguments.
   */
  private sanitizeQueryString(queryString: string): string {
    if (!queryString) return '';
    // Split on & and check each parameter
    const params = queryString.split('&');
    const safeParams = params.filter((param) => {
      // If a parameter contains '=', it's a key=value pair (safe)
      if (param.includes('=')) return true;
      // If it starts with '-', it could be interpreted as a CLI flag (reject)
      if (param.startsWith('-') || param.startsWith('%2d') || param.startsWith('%2D')) {
        logger.warn(
          `[CGI] Rejected potential argument injection in query string: ${param.substring(0, 20)}`
        );
        return false;
      }
      return true;
    });
    return safeParams.join('&');
  }

  /**
   * Build CGI environment variables according to RFC 3875
   */
  private buildCgiEnvironment(scriptPath: string, request: CgiRequest): Record<string, string> {
    const url = request.url;
    const headers = request.headers;

    // Sanitize query string to prevent argument injection (CVE-2012-1823)
    const rawQueryString = url.search.startsWith('?') ? url.search.substring(1) : url.search;
    const sanitizedQueryString = this.sanitizeQueryString(rawQueryString);

    // Build base CGI environment
    const env: Record<string, string> = {
      // Required by PHP-CGI security (prevents direct execution attacks)
      REDIRECT_STATUS: 'CGI',

      // CGI/1.1 specification variables (RFC 3875)
      GATEWAY_INTERFACE: 'CGI/1.1',
      SERVER_SOFTWARE: 'flashpoint-game-service/1.0',
      SERVER_PROTOCOL: 'HTTP/1.1',
      SERVER_NAME: url.hostname || 'localhost',
      SERVER_PORT: url.port || '80',

      // Request information
      REQUEST_METHOD: request.method.toUpperCase(),
      REQUEST_URI: url.pathname + url.search,
      SCRIPT_NAME: url.pathname,
      SCRIPT_FILENAME: scriptPath,
      PATH_INFO: '',
      PATH_TRANSLATED: scriptPath,
      QUERY_STRING: sanitizedQueryString,

      // Document root
      DOCUMENT_ROOT: this.config.documentRoot,

      // Client information (localhost since this is proxied)
      REMOTE_ADDR: '127.0.0.1',
      REMOTE_HOST: 'localhost',
    };

    // Add content headers if body is present
    if (request.body && request.body.length > 0) {
      env.CONTENT_LENGTH = request.body.length.toString();
      env.CONTENT_TYPE = headers['content-type'] || 'application/x-www-form-urlencoded';
    }

    // Convert HTTP headers to CGI HTTP_* variables
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();

      // Skip content headers (handled separately)
      if (lowerKey === 'content-type' || lowerKey === 'content-length') {
        continue;
      }

      // Only pass allowed headers
      if (!ALLOWED_CGI_HEADERS.has(lowerKey)) {
        continue;
      }

      // Convert header name to CGI format: X-Custom-Header → HTTP_X_CUSTOM_HEADER
      const cgiKey = 'HTTP_' + key.toUpperCase().replace(/-/g, '_');
      env[cgiKey] = value;
    }

    return env;
  }

  /**
   * Pass only allowed environment variables to CGI scripts
   */
  private sanitizeProcessEnv(): Record<string, string> {
    const env: Record<string, string> = {};

    for (const key of ALLOWED_ENV_VARS) {
      if (process.env[key]) {
        env[key] = process.env[key]!;
      }
    }

    return env;
  }

  /**
   * Parse CGI output into response object
   *
   * CGI output format:
   * Header1: Value1\r\n
   * Header2: Value2\r\n
   * \r\n
   * Body content here...
   *
   * The Status header determines the HTTP response code.
   * Note: Some PHP configurations may use \n instead of \r\n.
   */
  private parseCgiOutput(output: Buffer): CgiResponse {
    // Find the header/body separator (empty line)
    // Try CRLF first (standard), then LF-only (some PHP configs)
    const outputStr = output.toString('binary');
    let separatorIndex = outputStr.indexOf('\r\n\r\n');
    let separatorLength = 4;
    let lineEnding = '\r\n';

    // Fallback to LF-only if CRLF not found
    if (separatorIndex === -1) {
      separatorIndex = outputStr.indexOf('\n\n');
      separatorLength = 2;
      lineEnding = '\n';
    }

    if (separatorIndex === -1) {
      // No headers found, treat entire output as body
      logger.warn('[CGI] No header separator found in output, treating as plain body');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html' },
        body: output,
      };
    }

    // Split headers and body
    const headerSection = outputStr.substring(0, separatorIndex);
    const bodyStart = separatorIndex + separatorLength;
    const body = output.slice(bodyStart);

    // Parse headers
    const headers: Record<string, string> = {};
    let statusCode = 200;

    const headerLines = headerSection.split(lineEnding);
    for (const line of headerLines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) continue;

      const name = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();

      if (name.toLowerCase() === 'status') {
        // Parse status code from "Status: 200 OK" or "Status: 302 Found"
        const statusMatch = value.match(/^(\d{3})/);
        if (statusMatch) {
          statusCode = parseInt(statusMatch[1], 10);
        }
      } else {
        headers[name] = value;
      }
    }

    // Ensure Content-Type is set
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'text/html';
    }

    return {
      statusCode,
      headers,
      body,
    };
  }
}
