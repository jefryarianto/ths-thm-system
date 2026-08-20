/* eslint-disable no-console */
import { getRequestContext } from './request-context';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface StructuredLog {
  level: LogLevel;
  ts: string;
  msg: string;
  requestId?: string;
  context?: string;
  [key: string]: unknown;
}

export function structuredLog(
  level: LogLevel,
  msg: string,
  opts?: { context?: string; requestId?: string; [key: string]: unknown },
): void {
  const ctx = getRequestContext();
  const entry: StructuredLog = {
    level,
    ts: new Date().toISOString(),
    msg,
    requestId: opts?.requestId ?? ctx?.requestId ?? '-',
    context: opts?.context,
  };
  if (opts) {
    for (const [k, v] of Object.entries(opts)) {
      if (k === 'context' || k === 'requestId') continue;
      entry[k] = v;
    }
  }
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (msg: string, opts?: Parameters<typeof structuredLog>[2]) => structuredLog('debug', msg, opts),
  info: (msg: string, opts?: Parameters<typeof structuredLog>[2]) => structuredLog('info', msg, opts),
  warn: (msg: string, opts?: Parameters<typeof structuredLog>[2]) => structuredLog('warn', msg, opts),
  error: (msg: string, opts?: Parameters<typeof structuredLog>[2]) => structuredLog('error', msg, opts),
};