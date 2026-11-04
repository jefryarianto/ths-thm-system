import { CsrfMiddleware } from './csrf.middleware';
import type { Request, Response, NextFunction } from 'express';

type MockResponse = Response & { status: jest.Mock; json: jest.Mock; cookie: jest.Mock };

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'POST',
    path: '/',
    originalUrl: '/api/anggota',
    headers: {},
    cookies: undefined,
    ...overrides,
  } as unknown as Request;
}

function makeRes(): MockResponse {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
  };
  return res as unknown as MockResponse;
}

describe('CsrfMiddleware', () => {
  let middleware: CsrfMiddleware;
  let next: NextFunction;

  beforeEach(() => {
    middleware = new CsrfMiddleware();
    next = jest.fn();
  });

  it('meloloskan POST /api/auth/login tanpa token (exempt, prefix-aware)', () => {
    const res = makeRes();
    // Nest memasang middleware per-route: req.path === '/' dan path asli ada di originalUrl.
    middleware.use(makeReq({ originalUrl: '/api/auth/login' }), res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  it('meloloskan request ber-Bearer token tanpa header CSRF', () => {
    const res = makeRes();
    middleware.use(
      makeReq({ headers: { authorization: 'Bearer abc.def.ghi' } }),
      res,
      next,
    );
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  it('menolak POST tanpa Bearer dan tanpa token CSRF', () => {
    const res = makeRes();
    middleware.use(makeReq(), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('meloloskan POST bila cookie dan header CSRF cocok', () => {
    const res = makeRes();
    middleware.use(
      makeReq({
        headers: { cookie: 'csrf_token=abc123', 'x-csrf-token': 'abc123' },
      }),
      res,
      next,
    );
    expect(next).toHaveBeenCalled();
  });

  it('menolak POST bila header CSRF tidak ada meski cookie ada', () => {
    const res = makeRes();
    middleware.use(makeReq({ headers: { cookie: 'csrf_token=abc123' } }), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('menyetel cookie CSRF pada request aman bila belum ada', () => {
    const res = makeRes();
    middleware.use(makeReq({ method: 'GET', originalUrl: '/api/health' }), res, next);
    expect(next).toHaveBeenCalled();
    expect(res.cookie).toHaveBeenCalledWith(
      'csrf_token',
      expect.any(String),
      expect.objectContaining({ httpOnly: false, sameSite: 'lax' }),
    );
  });
});
