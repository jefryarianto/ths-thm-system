import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';

type Listener = (...args: unknown[]) => void;

/**
 * Lightweight in-process event bus.
 *
 * Used to decouple modules that need to react to events without creating
 * direct imports or circular dependencies. Currently used to bridge
 * AuditService → EventsGateway without NotificationsModule depending on
 * ScopeModule or vice versa.
 *
 * Listeners are weak references (stored by reference), so each listener
 * must be the exact function reference passed to `on()` in order to be
 * removed by `off()`.
 */
@Injectable()
export class EventBusService implements OnModuleDestroy {
  private readonly logger = new Logger('EventBusService');
  private listeners = new Map<string, Set<Listener>>();

  /**
   * Register a listener for a named event.
   */
  on(event: string, listener: Listener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    this.listeners.get(event)!.add(listener);
  }

  /**
   * Remove a previously registered listener.
   */
  off(event: string, listener: Listener): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
      if (set.size === 0) this.listeners.delete(event);
    }
  }

  /**
   * Emit an event to all registered listeners.
   */
  emit(event: string, ...args: unknown[]): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const listener of set) {
        try {
          listener(...args);
        } catch (error) {
          this.logger.error(`EventBus listener error: ${(error as Error).message}`);
          // Swallow individual listener errors so one bad listener
          // doesn't break the entire event chain.
        }
      }
    }
  }

  /** Cleanup on module destroy to prevent memory leaks. */
  onModuleDestroy(): void {
    this.listeners.clear();
  }
}
