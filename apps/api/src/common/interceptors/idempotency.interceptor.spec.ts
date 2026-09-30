import {
  ExecutionContext,
  CallHandler,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { CacheService } from '../services/cache.service';
import { IDEMPOTENT_METADATA_KEY } from '../decorators/idempotent.decorator';

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;
  let reflector: jest.Mocked<Reflector>;
  let cache: jest.Mocked<CacheService>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    cache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as unknown as jest.Mocked<CacheService>;

    interceptor = new IdempotencyInterceptor(reflector, cache);
  });

  const createMockContext = (
    headers: Record<string, string> = {},
    user?: { id: string },
    method = 'POST',
    path = '/api/v1/dues',
  ): {
    context: ExecutionContext;
    res: { setHeader: jest.Mock; status: jest.Mock; statusCode: number };
  } => {
    const res = {
      setHeader: jest.fn(),
      status: jest.fn(),
      statusCode: 201,
    };

    const req = {
      headers,
      method,
      path,
      ip: '127.0.0.1',
      user,
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;

    return { context, res };
  };

  const createMockHandler = (
    returnValue: unknown = { id: 'due-1', amount: 50000 },
  ): CallHandler => ({
    handle: () => of(returnValue),
  });

  it('should pass through if no idempotency key is provided and not required', (done) => {
    const { context } = createMockContext();
    const handler = createMockHandler();
    reflector.getAllAndOverride.mockReturnValue(undefined);

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toEqual({ id: 'due-1', amount: 50000 });
      expect(cache.get).not.toHaveBeenCalled();
      done();
    });
  });

  it('should throw BadRequestException if idempotency key is required but missing', () => {
    const { context } = createMockContext();
    const handler = createMockHandler();
    reflector.getAllAndOverride.mockReturnValue({ required: true });

    expect(() => interceptor.intercept(context, handler)).toThrow(BadRequestException);
  });

  it('should throw ConflictException if a request with the same idempotency key is currently processing', () => {
    const { context } = createMockContext({ 'x-idempotency-key': 'req-key-1' }, { id: 'user-1' });
    const handler = createMockHandler();
    reflector.getAllAndOverride.mockReturnValue({});
    cache.get.mockReturnValue({ status: 'processing' });

    expect(() => interceptor.intercept(context, handler)).toThrow(ConflictException);
  });

  it('should return cached response with X-Idempotency-Hit header when already completed', (done) => {
    const { context, res } = createMockContext(
      { 'x-idempotency-key': 'req-key-1' },
      { id: 'user-1' },
    );
    const handler = createMockHandler({ id: 'new-due' });
    reflector.getAllAndOverride.mockReturnValue({ ttl: 60000 });
    cache.get.mockReturnValue({
      status: 'completed',
      response: { id: 'cached-due', amount: 50000 },
      statusCode: 200,
    });

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toEqual({ id: 'cached-due', amount: 50000 });
      expect(res.setHeader).toHaveBeenCalledWith('X-Idempotency-Hit', 'true');
      expect(res.status).toHaveBeenCalledWith(200);
      done();
    });
  });

  it('should lock key as processing and cache completed result on success', (done) => {
    const { context } = createMockContext({ 'x-idempotency-key': 'req-key-1' }, { id: 'user-1' });
    const handler = createMockHandler({ id: 'created-due' });
    reflector.getAllAndOverride.mockReturnValue({ ttl: 120000 });
    cache.get.mockReturnValue(undefined);

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toEqual({ id: 'created-due' });
      // 1st call: set processing lock
      expect(cache.set).toHaveBeenNthCalledWith(
        1,
        'idempotency:user-1:POST:/api/v1/dues:req-key-1',
        { status: 'processing' },
        30000,
      );
      // 2nd call: store completed result
      expect(cache.set).toHaveBeenNthCalledWith(
        2,
        'idempotency:user-1:POST:/api/v1/dues:req-key-1',
        { status: 'completed', response: { id: 'created-due' }, statusCode: 201 },
        120000,
      );
      done();
    });
  });

  it('should delete lock key when handler throws an error', (done) => {
    const { context } = createMockContext({ 'x-idempotency-key': 'req-key-1' }, { id: 'user-1' });
    const errorHandler: CallHandler = {
      handle: () => throwError(() => new Error('DB error')),
    };
    reflector.getAllAndOverride.mockReturnValue({});
    cache.get.mockReturnValue(undefined);

    interceptor.intercept(context, errorHandler).subscribe({
      error: (err) => {
        expect(err.message).toBe('DB error');
        expect(cache.del).toHaveBeenCalledWith('idempotency:user-1:POST:/api/v1/dues:req-key-1');
        done();
      },
    });
  });
});
