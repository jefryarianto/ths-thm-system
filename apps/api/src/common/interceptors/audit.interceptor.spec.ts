import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from '../services/audit.service';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let mockAuditService: {
    logDataAccess: jest.Mock;
    logDataMutation: jest.Mock;
  };
  let loggerSpy: { debug: jest.Mock };

  const createMockRequest = (overrides: Partial<Record<string, unknown>> = {}) => ({
    method: 'GET',
    url: '/api/members',
    user: { id: 'u1', email: 'user@test.com', role: 'admin_ranting' },
    ip: '127.0.0.1',
    ...overrides,
  });

  const createMockResponse = (statusCode = 200) => ({
    statusCode,
  });

  const createMockContext = (
    request: ReturnType<typeof createMockRequest>,
    response: ReturnType<typeof createMockResponse>,
  ): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as never);

  const createMockCallHandler = (result?: unknown): CallHandler => ({
    handle: () => of(result ?? { success: true }),
  } as never);

  beforeEach(() => {
    mockAuditService = {
      logDataAccess: jest.fn(),
      logDataMutation: jest.fn(),
    };
    loggerSpy = { debug: jest.fn() };
    interceptor = new AuditInterceptor(mockAuditService as never);
    Object.defineProperty(interceptor, 'logger', { value: loggerSpy, writable: false });
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('GET requests (data access)', () => {
    it('should log data access for GET requests', (done) => {
      const request = createMockRequest({ method: 'GET', url: '/api/members' });
      const response = createMockResponse(200);
      const context = createMockContext(request, response);

      interceptor.intercept(context, createMockCallHandler()).subscribe({
        next: () => {
          expect(mockAuditService.logDataAccess).toHaveBeenCalledTimes(1);
          expect(mockAuditService.logDataAccess).toHaveBeenCalledWith(
            expect.objectContaining({
              userId: 'u1',
              userEmail: 'user@test.com',
              userRole: 'admin_ranting',
              method: 'GET',
              path: '/api/members',
              statusCode: 200,
            }),
          );
          expect(mockAuditService.logDataMutation).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should log duration for GET requests', (done) => {
      const request = createMockRequest({ method: 'GET', url: '/api/members' });
      const response = createMockResponse(200);
      const context = createMockContext(request, response);

      interceptor.intercept(context, createMockCallHandler()).subscribe({
        next: () => {
          const callArgs = mockAuditService.logDataAccess.mock.calls[0][0];
          expect(callArgs.durationMs).toBeGreaterThanOrEqual(0);
          done();
        },
      });
    });
  });

  describe('Mutation requests (POST/PUT/PATCH/DELETE)', () => {
    it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('should log data mutation for %s requests', (method, done) => {
      const request = createMockRequest({ method, url: '/api/members' });
      const response = createMockResponse(method === 'POST' ? 201 : 200);
      const context = createMockContext(request, response);

      interceptor.intercept(context, createMockCallHandler()).subscribe({
        next: () => {
          expect(mockAuditService.logDataMutation).toHaveBeenCalledTimes(1);
          expect(mockAuditService.logDataMutation).toHaveBeenCalledWith(
            expect.objectContaining({
              method,
              path: '/api/members',
              statusCode: method === 'POST' ? 201 : 200,
            }),
          );
          expect(mockAuditService.logDataAccess).not.toHaveBeenCalled();
          done();
        },
      });
    });
  });

  describe('Excluded paths', () => {
    it.each(['/health', '/api/docs', '/api/docs-json', '/api/docs-some-plugin'])(
      'should skip logging for excluded path: %s',
      (path, done) => {
        const request = createMockRequest({ method: 'GET', url: path });
        const response = createMockResponse(200);
        const context = createMockContext(request, response);

        interceptor.intercept(context, createMockCallHandler()).subscribe({
          next: () => {
            expect(mockAuditService.logDataAccess).not.toHaveBeenCalled();
            expect(mockAuditService.logDataMutation).not.toHaveBeenCalled();
            done();
          },
        });
      },
    );
  });

  describe('Error handling', () => {
    it('should log non-403 errors to audit store', (done) => {
      const request = createMockRequest({ method: 'GET', url: '/api/members' });
      const response = createMockResponse(500);
      const context = createMockContext(request, response);

      const errorCallHandler: CallHandler = {
        handle: () => throwError(() => new Error('Server error')),
      } as never;

      interceptor.intercept(context, errorCallHandler).subscribe({
        error: () => {
          expect(mockAuditService.logDataAccess).not.toHaveBeenCalled();
          expect(mockAuditService.logDataMutation).toHaveBeenCalledTimes(1);
          expect(mockAuditService.logDataMutation).toHaveBeenCalledWith(
            expect.objectContaining({
              method: 'GET',
              path: '/api/members',
              statusCode: 500,
              details: { error: 'Server error' },
            }),
          );
          done();
        },
      });
    });

    it('should skip audit logging for 403 errors (already logged by ScopeGuard)', (done) => {
      const request = createMockRequest({ method: 'GET', url: '/api/members' });
      const response = createMockResponse(403);
      const context = createMockContext(request, response);

      const errorCallHandler: CallHandler = {
        handle: () => throwError(() => new Error('Forbidden')),
      } as never;

      interceptor.intercept(context, errorCallHandler).subscribe({
        error: () => {
          expect(mockAuditService.logDataAccess).not.toHaveBeenCalled();
          expect(mockAuditService.logDataMutation).not.toHaveBeenCalled();
          done();
        },
      });
    });
  });

  describe('Missing user context', () => {
    it('should handle request without user', (done) => {
      const request = createMockRequest({ user: undefined });
      const response = createMockResponse(200);
      const context = createMockContext(request, response);

      interceptor.intercept(context, createMockCallHandler()).subscribe({
        next: () => {
          expect(mockAuditService.logDataAccess).toHaveBeenCalledWith(
            expect.objectContaining({
              userId: undefined,
              userEmail: undefined,
              userRole: undefined,
            }),
          );
          done();
        },
      });
    });
  });

  describe('Missing method/url', () => {
    it('should default to UNKNOWN for missing method and url', (done) => {
      const request = createMockRequest({ method: undefined, url: undefined });
      const response = createMockResponse(200);
      const context = createMockContext(request, response);

      interceptor.intercept(context, createMockCallHandler()).subscribe({
        next: () => {
          expect(mockAuditService.logDataAccess).toHaveBeenCalledWith(
            expect.objectContaining({
              method: 'UNKNOWN',
              path: 'UNKNOWN',
            }),
          );
          done();
        },
      });
    });
  });
});
