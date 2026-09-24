import { Test } from '@nestjs/testing';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();
    service = module.get(MetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should record request metrics per method+status', () => {
    service.record('GET', 200, 10);
    service.record('GET', 200, 20);
    service.record('POST', 500, 50);

    const snap = service.snapshot();
    expect(snap.http.totalRequests).toBe(3);
    const get200 = snap.http.byMethodStatus.find((m) => m.method === 'GET' && m.status === 200);
    expect(get200?.count).toBe(2);
    expect(get200?.totalDurationMs).toBe(30);
    expect(get200?.maxDurationMs).toBe(20);
  });

  it('should include process memory and uptime', () => {
    const snap = service.snapshot();
    expect(snap.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(snap.memory.heapUsedMb).toBeGreaterThanOrEqual(0);
    expect(snap.memory.rssMb).toBeGreaterThanOrEqual(0);
  });

  it('should render Prometheus text format with counters and gauges', () => {
    service.record('GET', 200, 15);
    const text = service.prometheus();
    expect(text).toContain('# HELP ths_http_requests_total');
    expect(text).toContain('ths_http_requests_total{method="GET",status="200"} 1');
    expect(text).toContain('ths_process_memory_bytes{type="rss"}');
    expect(text.endsWith('\n')).toBe(true);
  });

  it('should include websocket stats when gateway provides them', async () => {
    const module = await Test.createTestingModule({
      providers: [
        MetricsService,
        {
          provide: 'EVENTS_GATEWAY',
          useValue: {
            getStats: () => ({
              totalConnections: 5,
              uniqueUsers: 3,
              security: { throttledPackets: 2, rejectedConnections: 1 },
            }),
          },
        },
      ],
    }).compile();
    const svc = module.get(MetricsService);
    // Ganti injeksi gateway dengan nilai mock via reflection
    (svc as unknown as { eventsGateway?: unknown }).eventsGateway = {
      getStats: () => ({
        totalConnections: 5,
        uniqueUsers: 3,
        security: { throttledPackets: 2, rejectedConnections: 1 },
      }),
    };
    const snap = svc.snapshot();
    expect(snap.websocket?.totalConnections).toBe(5);
    expect(snap.websocket?.security?.throttledPackets).toBe(2);
  });

  it('should record auth metrics per operation+result', () => {
    service.recordAuth('session_verify', 'success', 10);
    service.recordAuth('session_verify', 'success', 20);
    service.recordAuth('session_verify', 'unauthorized', 5);
    service.recordAuth('refresh', 'success', 30);

    const snap = service.snapshot();
    const verifySuccess = snap.auth.byOperationResult.find(
      (a) => a.operation === 'session_verify' && a.result === 'success',
    );
    expect(verifySuccess?.count).toBe(2);
    expect(verifySuccess?.totalDurationMs).toBe(30);
    expect(verifySuccess?.maxDurationMs).toBe(20);

    const verifyUnauthorized = snap.auth.byOperationResult.find(
      (a) => a.operation === 'session_verify' && a.result === 'unauthorized',
    );
    expect(verifyUnauthorized?.count).toBe(1);
  });

  it('should render auth metrics in Prometheus format with predefined labels only', () => {
    service.recordAuth('session_verify', 'success', 15);
    service.recordAuth('refresh', 'unauthorized', 7);

    const text = service.prometheus();
    expect(text).toContain('# HELP ths_auth_requests_total');
    expect(text).toContain(
      'ths_auth_requests_total{operation="session_verify",result="success"} 1',
    );
    expect(text).toContain(
      'ths_auth_request_duration_ms_total{operation="refresh",result="unauthorized"} 7',
    );
    expect(text).toContain('ths_auth_request_duration_max_ms');
  });

  it('should not emit token values or identity data in auth metric output', () => {
    service.recordAuth('session_verify', 'success', 15);
    const text = service.prometheus();
    expect(text).not.toMatch(/token/i);
    expect(text).not.toMatch(/Bearer/i);
    expect(text).not.toMatch(/Authorization/i);
    expect(text).not.toMatch(/userId|sessionId|tabId/i);
    expect(text).not.toMatch(/\?|query/i);
  });

  it('should restrict auth metric labels to predefined finite value sets', () => {
    const all = service['authMetrics'] as Map<string, unknown>;
    // Keys are `${operation}:${result}` from AUTH_OPERATIONS × AUTH_RESULTS
    service.recordAuth('session_verify', 'success', 1);
    service.recordAuth('refresh', 'internal', 1);
    service.recordAuth('logout', 'unauthorized', 1);

    for (const key of all.keys()) {
      const [operation, result] = key.split(':');
      expect(['session_verify', 'refresh', 'logout']).toContain(operation);
      expect(['success', 'unauthorized', 'internal']).toContain(result);
    }
  });
});