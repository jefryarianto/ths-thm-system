'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Hook to consume a Server-Sent Events (SSE) stream with auto-reconnect.
 *
 * Uses the native `EventSource` API — no extra client library needed.
 * Falls back silently if EventSource is not available (very old browsers).
 *
 * Auth errors (401/403) are detected via the `error` SSE event sent by the server
 * and stop reconnecting immediately instead of looping forever.
 *
 * @param url - The SSE endpoint URL (relative or absolute)
 * @param options.token - JWT token passed as query param (EventSource can't set headers)
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
    onEvent?: (event: string, data: unknown) => void;
    onConnected?: () => void;
    enabled?: boolean;
    maxRetries?: number;
  } = {},
) {
  const { token, onEvent, onConnected, enabled = true, maxRetries = 5 } = options;
  const eventSourceRef = useRef<EventSource | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const retryCountRef = useRef(0);
  const shouldReconnectRef = useRef(true);

  // Keep the latest callback ref to avoid re-creating EventSource on every render
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const onConnectedRef = useRef(onConnected);
  onConnectedRef.current = onConnected;

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
    if (!enabled || !token || typeof window === 'undefined') return;

    // Check EventSource availability
    if (typeof EventSource === 'undefined') return;

    const tokenParam = encodeURIComponent(token);
    const separator = url.includes('?') ? '&' : '?';
    const fullUrl = `${url}${separator}token=${tokenParam}`;

    let es: EventSource;
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      shouldReconnectRef.current = true;

      // Close any previous connection
      if (es) {
        es.close();
      }

      es = new EventSource(fullUrl);
      eventSourceRef.current = es;

      // Listen for the 'connected' named event from the server
      es.addEventListener('connected', () => {
        retryCountRef.current = 0;
        setConnected(true);
        onConnectedRef.current?.();
      });

      // Listen for the 'error' named event (auth failure, rate limit, etc.)
      es.addEventListener('error', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          // Auth errors: stop reconnecting
          if (data.code === 'UNAUTHORIZED' || data.code === 'FORBIDDEN') {
            shouldReconnectRef.current = false;
          }
          onEventRef.current?.('error', data);
        } catch {
          // non-JSON error event — ignore
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
            // non-JSON event data — ignore
          }
        });
      }

      es.onerror = () => {
        // Don't update state if destroyed
        if (destroyed) return;

        setConnected(false);
        es.close();

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

    connect();

    return () => {
      destroyed = true;
      shouldReconnectRef.current = false;
      close();
    };
  }, [url, token, enabled, close, maxRetries]);

  return { connected, close };
}
