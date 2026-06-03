declare module 'socket.io-client' {
  export function io(url: string, options?: Record<string, unknown>): Socket;

  export interface Socket {
    connected: boolean;
    on(event: string, callback: (...args: any[]) => void): this;
    off(event: string): this;
    disconnect(): void;
  }
}