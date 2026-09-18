/**
 * Typed API client berbasis kontrak OpenAPI (apps/api/swagger.json → api.d.ts).
 *
 * Path HARUS salah satu dari union path kontrak untuk method terkait
 * (PathsWithMethod), sehingga typo path, method yang tidak tersedia, path
 * param yang hilang, dan bentuk query/body tervalidasi compile-time.
 * Gate CI `contract` menjaga file ini tetap sinkron dengan backend.
 *
 * Catatan jujur: kontrak saat ini belum mendeklarasikan schema response
 * (controller belum menganotasi @ApiOkResponse bertipe), jadi tipe data
 * respons tetap ditentukan pemanggil lewat generic `get<T>(...)` atau helper
 * `unwrap<T>` dari api-client — sama seperti di seluruh web hari ini. Yang
 * type-safe di sini adalah request-nya (path, path params, query, body DTO).
 *
 * Contoh (pola yang dianjurkan — sama seperti apiClient existing):
 *   const res = await typedApi.get('/members/{id}', { path: { id } });
 *   const member = unwrap<Member>(res); // T dari pemanggil, bukan kontrak
 *
 * T default-nya `never` sehingga unwrap<T>(res) selalu compile, sementara
 * akses langsung res.data.data (tanpa unwrap) ditolak compiler.
 */
import type { paths } from '@/types/api';
import apiClient, { type ApiResponse } from './api-client';

type Method = 'get' | 'post' | 'patch' | 'put' | 'delete';

/** Semua path kontrak yang punya method tertentu (ala openapi-fetch). */
export type PathsWithMethod<M extends Method> = {
  [P in keyof paths]: paths[P] extends { [K in M]: unknown } ? P : never;
}[keyof paths];

/** Entry path dari kontrak; error compile bila path tidak dikenal. */
export type PathEntry<P extends keyof paths> = paths[P];

type ParamsOf<P extends keyof paths, M extends Method> = PathEntry<P>[M] extends {
  parameters?: infer TParams;
}
  ? TParams
  : never;

type PathParamsOf<P extends keyof paths, M extends Method> =
  ParamsOf<P, M> extends { path: infer TPath } ? TPath : never;

type QueryOf<P extends keyof paths, M extends Method> =
  ParamsOf<P, M> extends { query?: infer TQuery } ? TQuery : Record<string, never>;

/** Body JSON request dari DTO kontrak (void bila operasi tanpa requestBody). */
type BodyOf<P extends keyof paths, M extends Method> = PathEntry<P>[M] extends {
  requestBody: { content: { 'application/json': infer TBody } };
}
  ? TBody
  : void;

type RequestConfig = {
  signal?: AbortSignal;
  headers?: Record<string, string>;
};

/** Argumen get/delete: wajib hanya bila path punya path param. */
type ReadArgs<P extends keyof paths, M extends Method> = [PathParamsOf<P, M>] extends [never]
  ? [] | [{ query?: QueryOf<P, M> }]
  : [{ path: PathParamsOf<P, M>; query?: QueryOf<P, M> }];

/** Params post/patch/put: path param wajib bila operasinya membutuhkannya. */
type WriteParams<P extends keyof paths, M extends Method> = [PathParamsOf<P, M>] extends [never]
  ? { query?: QueryOf<P, M> }
  : { path: PathParamsOf<P, M>; query?: QueryOf<P, M> };

type FlatParams = {
  path?: Record<string, string>;
  query?: Record<string, unknown>;
};

function buildUrl(path: string, params: FlatParams): string {
  let url = path;
  if (params.path) {
    for (const [key, value] of Object.entries(params.path)) {
      url = url.replace(`{${key}}`, encodeURIComponent(String(value)));
    }
  }
  if (params.query) {
    const qs = Object.entries(params.query)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
    if (qs) {
      url += `?${qs}`;
    }
  }
  return url;
}

type TypedResponse<T> = { data: ApiResponse<T>; status: number };

class TypedApi {
  private async request<T>(
    method: Method,
    url: string,
    data: unknown,
    config: RequestConfig,
  ): Promise<TypedResponse<T>> {
    const res = await apiClient.request({
      method: method.toUpperCase(),
      url,
      ...(data !== undefined ? { data } : {}),
      signal: config.signal,
      headers: config.headers,
    });
    return { data: res.data as ApiResponse<T>, status: res.status };
  }

  /** GET terhadap path kontrak; path params & query bertipe. */
  async get<P extends PathsWithMethod<'get'> = PathsWithMethod<'get'>, T = never>(
    path: P,
    ...args: ReadArgs<P, 'get'>
  ): Promise<TypedResponse<T>> {
    const params = (args[0] ?? {}) as FlatParams;
    return this.request<T>('get', buildUrl(path, params), undefined, {});
  }

  /** POST dengan body dari DTO kontrak (field asing ditolak compiler). */
  async post<P extends PathsWithMethod<'post'> = PathsWithMethod<'post'>, T = never>(
    path: P,
    body: BodyOf<P, 'post'>,
    params?: WriteParams<P, 'post'>,
    config: RequestConfig = {},
  ): Promise<TypedResponse<T>> {
    return this.request<T>('post', buildUrl(path, (params ?? {}) as FlatParams), body, config);
  }

  /** PATCH dengan body dari DTO kontrak. */
  async patch<P extends PathsWithMethod<'patch'> = PathsWithMethod<'patch'>, T = never>(
    path: P,
    body: BodyOf<P, 'patch'>,
    params?: WriteParams<P, 'patch'>,
    config: RequestConfig = {},
  ): Promise<TypedResponse<T>> {
    return this.request<T>('patch', buildUrl(path, (params ?? {}) as FlatParams), body, config);
  }

  /** PUT dengan body dari DTO kontrak. */
  async put<P extends PathsWithMethod<'put'> = PathsWithMethod<'put'>, T = never>(
    path: P,
    body: BodyOf<P, 'put'>,
    params?: WriteParams<P, 'put'>,
    config: RequestConfig = {},
  ): Promise<TypedResponse<T>> {
    return this.request<T>('put', buildUrl(path, (params ?? {}) as FlatParams), body, config);
  }

  /** DELETE terhadap path kontrak (path params wajib bila ada). */
  async delete<P extends PathsWithMethod<'delete'> = PathsWithMethod<'delete'>, T = never>(
    path: P,
    ...args: ReadArgs<P, 'delete'>
  ): Promise<TypedResponse<T>> {
    const params = (args[0] ?? {}) as FlatParams;
    return this.request<T>('delete', buildUrl(path, params), undefined, {});
  }
}

export const typedApi = new TypedApi();
