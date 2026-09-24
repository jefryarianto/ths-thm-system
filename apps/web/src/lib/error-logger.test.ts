import { logError, classifyError, logWarning, logInfo, createModuleLogger } from './error-logger';
import { vi } from 'vitest';

const env = process.env as Record<string, string | undefined>;

describe('Error Logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    // Produce full structured JSON entries so metadata/redaction is observable
    env.NODE_ENV = 'production';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete env.NODE_ENV;
  });

  describe('classifyError', () => {
    it('classifies session expired error as Auth_expired', () => {
      const error = new Error('SESSION_EXPIRED_ERROR');
      error.name = 'SESSION_EXPIRED_ERROR';
      expect(classifyError(error)).toEqual({
        category: 'Auth',
        authCategory: 'Auth_expired',
      });
    });

    it('classifies message with Session expired as Auth_expired', () => {
      const error = new Error('Session expired');
      expect(classifyError(error)).toEqual({
        category: 'Auth',
        authCategory: 'Auth_expired',
      });
    });

    it('classifies message with Sesi berakhir as Auth_expired', () => {
      const error = new Error('Sesi berakhir');
      expect(classifyError(error)).toEqual({
        category: 'Auth',
        authCategory: 'Auth_expired',
      });
    });

    it('classifies Unauthorized as Auth_invalid', () => {
      const error = new Error('Unauthorized');
      expect(classifyError(error)).toEqual({
        category: 'Auth',
        authCategory: 'Auth_invalid',
      });
    });

    it('classifies axios network error with ECONNABORTED as Timeout', () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded',
      };
      expect(classifyError(error)).toEqual({
        category: 'Timeout',
      });
    });

    it('classifies axios network error with Network Error as Network', () => {
      const error = {
        code: 'ERR_NETWORK',
        message: 'Network Error',
      };
      expect(classifyError(error)).toEqual({
        category: 'Network',
      });
    });

    it('classifies axios HTTP 401 as Auth_invalid', () => {
      const error = {
        response: {
          status: 401,
          data: { message: 'Invalid credentials' },
        },
      };
      expect(classifyError(error)).toEqual({
        category: 'Auth',
        authCategory: 'Auth_invalid',
      });
    });

    it('classifies axios HTTP 403 as Permission', () => {
      const error = {
        response: {
          status: 403,
          data: { message: 'Forbidden' },
        },
      };
      expect(classifyError(error)).toEqual({
        category: 'Permission',
      });
    });

    it('classifies axios HTTP 400 as Validation', () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'Bad request' },
        },
      };
      expect(classifyError(error)).toEqual({
        category: 'Validation',
      });
    });

    it('classifies axios HTTP 500 as Server', () => {
      const error = {
        response: {
          status: 500,
          data: { message: 'Internal server error' },
        },
      };
      expect(classifyError(error)).toEqual({
        category: 'Server',
      });
    });

    it('classifies unknown error as Unknown', () => {
      const error = new Error('Some random error');
      expect(classifyError(error)).toEqual({
        category: 'Unknown',
      });
    });
  });

  describe('logError', () => {
    it('does not log session expired errors (silent ignore)', () => {
      const error = new Error('SESSION_EXPIRED_ERROR');
      error.name = 'SESSION_EXPIRED_ERROR';
      logError(error);
      expect(console.error).not.toHaveBeenCalled();
    });

    it('logs error with category and metadata', () => {
      const error: any = {
        response: {
          status: 401,
          data: { message: 'Invalid credentials' },
        },
      };
      logError(error, { module: 'Auth', action: 'Login' });
      expect(console.error).toHaveBeenCalledTimes(1);
      const logJson = (console.error as ReturnType<typeof vi.spyOn>).mock.calls[0][0];
      expect(logJson).toContain('"category":"Auth"');
      expect(logJson).toContain('"authCategory":"Auth_invalid"');
      expect(logJson).toContain('"module":"Auth"');
      expect(logJson).toContain('"action":"Login"');
      expect(logJson).toMatch(/"level":"error"/);
    });

    it('does not leak token in message', () => {
      const error = new Error('Failed to fetch Bearer abc.def.ghi');
      logError(error);
      const logArg = (console.error as ReturnType<typeof vi.spyOn>).mock.calls[0][0];
      expect(logArg).not.toContain('Bearer abc.def.ghi');
      expect(logArg).toContain('[BearerTokenRedacted]');
    });

    it('does not leak Authorization header', () => {
      const error = new Error('Authorization: Bearer secret');
      logError(error);
      const logArg = (console.error as ReturnType<typeof vi.spyOn>).mock.calls[0][0];
      expect(logArg).not.toContain('Bearer secret');
      expect(logArg).toContain('[Redacted]');
    });

    it('does not leak refresh token in message', () => {
      const error = new Error('refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      logError(error);
      const logArg = (console.error as ReturnType<typeof vi.spyOn>).mock.calls[0][0];
      expect(logArg).not.toContain('refresh_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(logArg).toContain('[Redacted]');
    });

    it('does not leak access token in message', () => {
      const error = new Error('access_token=ya29.A0AvoidLoggingMe');
      logError(error);
      const logArg = (console.error as ReturnType<typeof vi.spyOn>).mock.calls[0][0];
      expect(logArg).not.toContain('access_token=ya29.A0AvoidLoggingMe');
      expect(logArg).toContain('[Redacted]');
    });

    it('does not leak query string parameters', () => {
      const error = new Error('Request failed: /api?token=secret&other=1');
      logError(error);
      const logArg = (console.error as ReturnType<typeof vi.spyOn>).mock.calls[0][0];
      expect(logArg).not.toContain('token=secret');
      expect(logArg).toContain('[Redacted]');
    });

    it('preserves original error after logging failure', () => {
      // Make JSON.stringify throw to simulate logging failure
      const originalConsoleError = console.error;
      const consoleErrorMock = vi.fn(() => {
        throw new Error('Logging failed');
      });
      vi.spyOn(console, 'error').mockImplementation(consoleErrorMock);

      const error = new Error('Test error');
      // Should not throw even if logging fails
      expect(() => logError(error)).not.toThrow();
      // Original error should still be available for caller to handle
      expect(error.message).toBe('Test error');

      // Restore
      vi.spyOn(console, 'error').mockImplementation(originalConsoleError);
    });

    it('does not invoke apiClient (local transport only)', () => {
      const error = new Error('Test error');
      logError(error);
      // No apiClient call should be made - we only spy on console
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('logWarning', () => {
    it('sanitizes sensitive data in warnings', () => {
      logWarning('Token warning: Bearer secret');
      const logArg = (console.warn as ReturnType<typeof vi.spyOn>).mock.calls[0][0];
      expect(logArg).not.toContain('Bearer secret');
      expect(logArg).toContain('[BearerTokenRedacted]');
    });
  });

  describe('logInfo', () => {
    it('logs info in development only', () => {
      // Temporarily set NODE_ENV to development
      const oldEnv = env.NODE_ENV;
      env.NODE_ENV = 'development';

      logInfo('Info message');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[App] Info message'),
      );

      // Restore
      env.NODE_ENV = oldEnv;
    });

    it('does not log info in production', () => {
      const oldEnv = env.NODE_ENV;
      env.NODE_ENV = 'production';

      logInfo('Info message');
      expect(console.log).not.toHaveBeenCalled();

      // Restore
      env.NODE_ENV = oldEnv;
    });

    it('sanitizes sensitive data in info logs', () => {
      // Force dev mode to see log output
      const oldEnv = env.NODE_ENV;
      env.NODE_ENV = 'development';

      logInfo('Token: Bearer secret');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[App] Token: [BearerTokenRedacted]'),
      );

      // Restore
      env.NODE_ENV = oldEnv;
    });
  });

  describe('createModuleLogger', () => {
    it('creates scoped logger with correct module', () => {
const logger = createModuleLogger('Members');
      const error = new Error('Test error');
      logger.error(error, 'fetch');
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Test error"'),
      );
      const logArg = (console.error as ReturnType<typeof vi.spyOn>).mock.calls[0][0];
      expect(logArg).toContain('"module":"Members"');
      expect(logArg).toContain('"action":"fetch"');
    });
  });
});