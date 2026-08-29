'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { ensureFreshToken } from '@/lib/api-client';

/**
 * Hook to consume a Server-Sent Events (SSE) stream with auto-reconnect.
 *
 * Uses the native `EventSource` API - no extra client library needed.
 * Falls back silently if EventSource is not available (very old browsers).
 *
 * Auth errors (401/403) are detected via the `error` SSE event sent by the server
 * and stop reconnecting immediately instead of looping forever.
 *
 * @param url - The SSE endpoint URL (relative or absolute)
 * @param options.token - JWT token passed as query param (EventSource can't set headers)
 * @param options.getToken - Alternatif dari `token`: resolve token saat setiap
 *   (re)connect, sehingga reconnect setelah idle memakai access token terbaru.
 * @param options.onEvent - Callback for each named SSE event
 * @param options.onConnected - Callback when initial connection is established
 * @param options.enabled - Whether to connect (default: true)
 * @param options.maxRetries - Maximum reconnection attempts before giving up (default: 5)
 * @returns An object with connection state and a `close()` function
 */
export function useSSE(
  url: string,
  options: {
    token?: string;
    /** Resolve token saat setiap (re)connect — dipakai agar reconnect setelah idle memakai token terbaru. */
    getToken?: () => string | null | undefined;
    onEvent?: (event: string, data: unknown) => void;
    onConnected?: () => void;
    enabled?: boolean;
    maxRetries?: number;
  } = {},
) {
  const { token, getToken, onEvent, onConnected, enabled = true, maxRetries = 5 } = options;
  const eventSourceRef = useRef<EventSource | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const retryCountRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  // Penghitung percobaan re-auth setelah UNAUTHORIZED — dibatasi agar sebuah
  // endpoint yang selalu menolak tidak memicu loop refresh tanpa henti.
  const authRetryCountRef = useRef(0);
  const reauthInFlightRef = useRef(false);

  // Keep the latest callback ref to avoid re-creating EventSource on every render
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const onConnectedRef = useRef(onConnected);
  onConnectedRef.current = onConnected;
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const close = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setConnected(false);
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Check EventSource availability
    if (typeof EventSource === 'undefined') return;

    let es: EventSource | undefined;
    let destroyed = false;

    // Resolve token SAAT CONNECT (bukan snapshot saat mount). Setelah idle
    // lama token bisa sudah di-refresh oleh api-client — reconnect harus
    // memakai token terbaru agar tidak langsung ditolak server.
    const resolveToken = (): string | null => {
      const t = getTokenRef.current?.() ?? token ?? null;
      return t && t.trim() ? t : null;
    };

    function connect() {
      if (destroyed) return;
      const activeToken = resolveToken();
      if (!activeToken) return; // belum ada token (mis. sesi belum login)

      shouldReconnectRef.current = true;

      // Close any previous connection
      if (es) {
        es.close();
      }

      const tokenParam = encodeURIComponent(activeToken);
      const separator = url.includes('?') ? '&' : '?';
      es = new EventSource(`${url}${separator}token=${tokenParam}`);
      eventSourceRef.current = es;

      // Listen for the 'connected' named event from the server
      es.addEventListener('connected', () => {
        retryCountRef.current = 0;
        authRetryCountRef.current = 0;
        reauthInFlightRef.current = false;
        setConnected(true);
        onConnectedRef.current?.();
      });

      // Listen for the 'error' named event (auth failure, rate limit, etc.)
      es.addEventListener('error', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data.code === 'UNAUTHORIZED' || data.code === 'FORBIDDEN') {
            // Token koneksi ini sudah ditolak server. Coba SATU silent
            // re-auth via cookie refresh (single-flight di api-client), lalu
            // reconnect dengan token baru. Dibatasi beberapa kali agar
            // endpoint yang selalu menolak tidak memicu loop refresh tanpa
            // henti.
            shouldReconnectRef.current = false;
            authRetryCountRef.current += 1;
            if (authRetryCountRef.current <= 2 && !reauthInFlightRef.current) {
              reauthInFlightRef.current = true;
              ensureFreshToken()
                .then((freshToken) => {
                  reauthInFlightRef.current = false;
                  if (destroyed) return;
                  if (freshToken) {
                    retryCountRef.current = 0;
                    connect(); // connect() membaca ulang token terbaru
                  }
                })
                .catch(() => {
                  reauthInFlightRef.current = false;
                  // Refresh gagal (mis. sesi benar-benar berakhir) → biarkan
                  // tertutup; resume-handler akan mencoba lagi saat tab aktif.
                });
            }
          }
          onEventRef.current?.('error', data);
        } catch {
          // non-JSON error event - ignore
        }
      });

      // Listen for custom named events (audit:new, etc.) via onmessage.
      // NOTE: onmessage only fires for unnamed events in the SSE spec,
      // but most named events also fire onmessage in practice. For
      // reliability, register a generic listener that captures all named events.
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          onEventRef.current?.('message', data);
        } catch {
          // ignore non-JSON messages (like comment-only heartbeats)
        }
      };

      // Generic catch-all: listen for any named event not handled above.
      // Use addEventListener for each known event type.
      const knownNamedEvents = ['audit:new'];
      for (const eventName of knownNamedEvents) {
        es.addEventListener(eventName, (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            onEventRef.current?.(eventName, data);
          } catch {
            // non-JSON event data - ignore
          }
        });
      }

      es.onerror = () => {
        // Don't update state if destroyed
        if (destroyed) return;

        setConnected(false);
        es?.close();

        // If the server sent an error event that we already processed (auth failure),
        // shouldReconnectRef was set to false. Don't auto-reconnect.
        if (!shouldReconnectRef.current || destroyed) return;

        retryCountRef.current += 1;

        if (retryCountRef.current > maxRetries) {
          return; // Give up after max retries
        }

        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 16_000);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };
    }

    // Tab kembali aktif setelah lama idle → koneksi SSE biasanya sudah
    // diputus OS/proxy dan token mungkin sudah di-refresh. Bangun ulang
    // koneksi segera dengan token TERBARU alih-alih menunggu sisa backoff.
    const resume = () => {
      if (destroyed) return;
      const isClosed =
        !eventSourceRef.current ||
        eventSourceRef.current.readyState === EventSource.CLOSED;
      if (isClosed) {
        retryCountRef.current = 0;
        connect();
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') resume();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', resume);

    connect();

    return () => {
      destroyed = true;
      shouldReconnectRef.current = false;
      close();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', resume);
    };
  }, [url, token, enabled, close, maxRetries]);

  return { connected, close };
}
