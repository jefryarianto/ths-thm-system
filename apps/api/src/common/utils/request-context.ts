import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export interface RequestContext {
  requestId: string;
  userId?: string | null;
  distrikId?: string | null;
  startedAt: number;
}

export const requestContextStore = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return requestContextStore.getStore();
}

export function getRequestId(): string {
  return getRequestContext()?.requestId ?? '-';
}

export function createRequestId(incoming?: string): string {
  if (incoming && /^[A-Za-z0-9-]{8,64}$/.test(incoming)) return incoming;
  return randomUUID();
}