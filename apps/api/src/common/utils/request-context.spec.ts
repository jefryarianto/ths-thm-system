import { createRequestId, getRequestId, requestContextStore } from './request-context';
import { structuredLog } from './structured-logger';

describe('request-context', () => {
  it('should accept a valid incoming request id as-is', () => {
    expect(createRequestId('abc-123-XYZ-9')).toBe('abc-123-XYZ-9');
  });

  it('should generate a uuid for invalid/absent ids', () => {
    const id = createRequestId(undefined);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    // Jangan terima input berbahaya (mis. path traversal)
    expect(createRequestId('../../etc/passwd')).not.toBe('../../etc/passwd');
    expect(createRequestId('x')).not.toBe('x');
  });

  it('should return "-" when no context is set', () => {
    expect(getRequestId()).toBe('-');
  });

  it('should expose requestId inside the store', async () => {
    const seen = await new Promise<string>((resolve) => {
      requestContextStore.run({ requestId: 'rid-1', startedAt: Date.now() }, () => {
        resolve(getRequestId());
      });
    });
    expect(seen).toBe('rid-1');
  });
});

describe('structured-logger', () => {
  it('should emit a single-line JSON entry with requestId', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    structuredLog('info', 'hello', { context: 'test', foo: 1 });
    const line = spy.mock.calls[0][0] as string;
    const parsed = JSON.parse(line);
    expect(parsed.msg).toBe('hello');
    expect(parsed.context).toBe('test');
    expect(parsed.requestId).toBe('-');
    expect(parsed.foo).toBe(1);
    expect(parsed.ts).toBeDefined();
    expect(line.split('\n')).toHaveLength(1);
    spy.mockRestore();
  });

  it('should use console.error for error level', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    structuredLog('error', 'boom');
    expect(JSON.parse(spy.mock.calls[0][0] as string).level).toBe('error');
    spy.mockRestore();
  });
});