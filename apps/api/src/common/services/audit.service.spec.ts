import { Test, TestingModule } from '@nestjs/testing';
import { AuditService, AuditEventType } from './audit.service';
import { AuditLogStore } from './audit-log-store.service';

describe('AuditService', () => {
  let service: AuditService;
  let loggerSpy: { warn: jest.Mock; log: jest.Mock; debug: jest.Mock };
  let mockStore: { add: jest.Mock };

  beforeEach(async () => {
    loggerSpy = {
      warn: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
    };
    mockStore = { add: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: AuditLogStore, useValue: mockStore },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);

    // Replace the internal Logger instance with our spy
    Object.defineProperty(service, 'logger', { value: loggerSpy, writable: false });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logScopeViolation', () => {
    it('should log a warn message with user context', () => {
      service.logScopeViolation({
        userId: 'u1',
        userEmail: 'admin@test.com',
        userRole: 'admin_ranting',
        userScope: { rantingId: 'r1' },
        requiredScope: 'national',
        method: 'GET',
        path: '/api/members',
        ip: '192.168.1.1',
      });

      expect(loggerSpy.warn).toHaveBeenCalledTimes(1);
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('[SCOPE_VIOLATION]'),
      );
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('admin@test.com'),
      );
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('admin_ranting'),
      );
    });

    it('should log structured JSON with all fields', () => {
      service.logScopeViolation({
        userId: 'u1',
        userEmail: 'admin@test.com',
        userRole: 'admin_ranting',
        userScope: { rantingId: 'r1' },
        requiredScope: 'national',
        method: 'GET',
        path: '/api/members',
        ip: '192.168.1.1',
      });

      expect(loggerSpy.log).toHaveBeenCalledTimes(1);
      const loggedEntry = JSON.parse(loggerSpy.log.mock.calls[0][0]);
      expect(loggedEntry.eventType).toBe(AuditEventType.SCOPE_VIOLATION);
      expect(loggedEntry.userId).toBe('u1');
      expect(loggedEntry.userEmail).toBe('admin@test.com');
      expect(loggedEntry.userRole).toBe('admin_ranting');
      expect(loggedEntry.method).toBe('GET');
      expect(loggedEntry.path).toBe('/api/members');
      expect(loggedEntry.details.requiredScope).toBe('national');
      expect(loggedEntry.details.ip).toBe('192.168.1.1');
      expect(loggedEntry.details.reason).toBe('Insufficient scope level for endpoint');
      expect(loggedEntry.timestamp).toBeDefined();
    });

    it('should store the entry in AuditLogStore', () => {
      service.logScopeViolation({
        requiredScope: 'branch',
        method: 'POST',
        path: '/api/candidates',
      });

      expect(mockStore.add).toHaveBeenCalledTimes(1);
      const stored = mockStore.add.mock.calls[0][0];
      expect(stored.eventType).toBe(AuditEventType.SCOPE_VIOLATION);
      expect(stored.method).toBe('POST');
    });

    it('should handle missing optional fields gracefully', () => {
      service.logScopeViolation({
        requiredScope: 'branch',
        method: 'POST',
        path: '/api/candidates',
      });

      expect(loggerSpy.warn).toHaveBeenCalledTimes(1);
      expect(loggerSpy.log).toHaveBeenCalledTimes(1);
      const loggedEntry = JSON.parse(loggerSpy.log.mock.calls[0][0]);
      expect(loggedEntry.userEmail).toBeUndefined();
      expect(loggedEntry.userRole).toBeUndefined();
      expect(loggedEntry.details.ip).toBeUndefined();
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('unknown'),
      );
    });
  });

  describe('logDataAccess', () => {
    it('should log a debug message with timing', () => {
      service.logDataAccess({
        userId: 'u1',
        userEmail: 'user@test.com',
        userRole: 'admin_ranting',
        method: 'GET',
        path: '/api/members',
        statusCode: 200,
        durationMs: 42,
      });

      expect(loggerSpy.debug).toHaveBeenCalledTimes(1);
      const loggedEntry = JSON.parse(loggerSpy.debug.mock.calls[0][0]);
      expect(loggedEntry.eventType).toBe(AuditEventType.DATA_ACCESS);
      expect(loggedEntry.method).toBe('GET');
      expect(loggedEntry.path).toBe('/api/members');
      expect(loggedEntry.statusCode).toBe(200);
      expect(loggedEntry.durationMs).toBe(42);
    });

    it('should NOT store DATA_ACCESS in AuditLogStore to avoid buffer flooding', () => {
      service.logDataAccess({
        method: 'GET',
        path: '/api/members',
        statusCode: 200,
        durationMs: 10,
      });

      expect(mockStore.add).not.toHaveBeenCalled();
    });

    it('should include optional details', () => {
      service.logDataAccess({
        method: 'GET',
        path: '/api/members',
        statusCode: 200,
        durationMs: 10,
        details: { query: 'test' },
      });

      const loggedEntry = JSON.parse(loggerSpy.debug.mock.calls[0][0]);
      expect(loggedEntry.details).toEqual({ query: 'test' });
    });
  });

  describe('logDataMutation', () => {
    it('should log a log-level message for mutations', () => {
      service.logDataMutation({
        userId: 'u1',
        method: 'POST',
        path: '/api/members',
        statusCode: 201,
        durationMs: 85,
      });

      expect(loggerSpy.log).toHaveBeenCalledTimes(1);
      const loggedEntry = JSON.parse(loggerSpy.log.mock.calls[0][0]);
      expect(loggedEntry.eventType).toBe(AuditEventType.DATA_MUTATION);
      expect(loggedEntry.method).toBe('POST');
      expect(loggedEntry.statusCode).toBe(201);
      expect(loggedEntry.durationMs).toBe(85);
    });

    it('should store the entry in AuditLogStore', () => {
      service.logDataMutation({
        userId: 'u1',
        method: 'DELETE',
        path: '/api/members/123',
        statusCode: 200,
        durationMs: 50,
      });

      expect(mockStore.add).toHaveBeenCalledTimes(1);
      const stored = mockStore.add.mock.calls[0][0];
      expect(stored.eventType).toBe(AuditEventType.DATA_MUTATION);
      expect(stored.method).toBe('DELETE');
    });
  });

  describe('logAuthFailure', () => {
    it('should log a warn message with reason', () => {
      service.logAuthFailure({
        method: 'POST',
        path: '/api/auth/login',
        reason: 'Invalid credentials',
        ip: '10.0.0.1',
      });

      expect(loggerSpy.warn).toHaveBeenCalledTimes(1);
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('[AUTH_FAILURE]'),
      );
      expect(loggerSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid credentials'),
      );
    });

    it('should store the entry in AuditLogStore', () => {
      service.logAuthFailure({
        method: 'POST',
        path: '/api/auth/login',
        reason: 'Token expired',
      });

      expect(mockStore.add).toHaveBeenCalledTimes(1);
      const stored = mockStore.add.mock.calls[0][0];
      expect(stored.eventType).toBe(AuditEventType.AUTH_FAILURE);
    });

    it('should log structured JSON with auth failure details', () => {
      service.logAuthFailure({
        method: 'POST',
        path: '/api/auth/login',
        reason: 'Token expired',
      });

      expect(loggerSpy.log).toHaveBeenCalledTimes(1);
      const loggedEntry = JSON.parse(loggerSpy.log.mock.calls[0][0]);
      expect(loggedEntry.eventType).toBe(AuditEventType.AUTH_FAILURE);
      expect(loggedEntry.method).toBe('POST');
      expect(loggedEntry.path).toBe('/api/auth/login');
      expect(loggedEntry.details.reason).toBe('Token expired');
    });
  });
});
