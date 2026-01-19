// WebSocket service for real-time notifications

import { getServiceConfig } from './base';

export type WebSocketEventType =
  | 'device_discovered'
  | 'device_online'
  | 'device_offline'
  | 'backup_started'
  | 'backup_completed'
  | 'backup_failed'
  | 'config_pulled';

export interface DeviceDiscoveredPayload {
  mac: string;
  ip: string;
  hostname?: string;
  vendor?: string;
}

export interface ConfigPulledPayload {
  mac: string;
  ip: string;
  hostname?: string;
  filename: string;
  protocol: 'tftp' | 'http';
}

export interface WebSocketEvent<T = unknown> {
  type: WebSocketEventType;
  payload: T;
}

export type WebSocketEventHandler<T = unknown> = (event: WebSocketEvent<T>) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private handlers: Map<WebSocketEventType, Set<WebSocketEventHandler>> = new Map();
  private globalHandlers: Set<WebSocketEventHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  private shouldReconnect = true;

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    this.shouldReconnect = true;

    const config = getServiceConfig();
    const baseUrl = config.baseUrl || '/api';

    // Convert HTTP URL to WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsUrl: string;

    if (baseUrl.startsWith('http')) {
      // Absolute URL - replace protocol
      wsUrl = baseUrl.replace(/^https?:/, protocol) + '/ws';
    } else {
      // Relative URL - use current host
      wsUrl = `${protocol}//${window.location.host}${baseUrl}/ws`;
    }

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        console.log('WebSocket connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketEvent;
          this.handleEvent(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      this.ws.onclose = (event) => {
        this.isConnecting = false;
        this.ws = null;

        if (!event.wasClean && this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        this.isConnecting = false;
        // Only log on first connect attempt to avoid spam
        if (this.reconnectAttempts === 0) {
          console.error('WebSocket error:', error);
        }
      };
    } catch (err) {
      this.isConnecting = false;
      console.error('Failed to create WebSocket:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('WebSocket max reconnect attempts reached');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect();
      }
    }, Math.min(delay, 30000)); // Cap at 30 seconds
  }

  disconnect(): void {
    this.shouldReconnect = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client closing');
      this.ws = null;
    }
  }

  private handleEvent(event: WebSocketEvent): void {
    // Call type-specific handlers
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (err) {
          console.error('Error in WebSocket event handler:', err);
        }
      });
    }

    // Call global handlers
    this.globalHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (err) {
        console.error('Error in global WebSocket event handler:', err);
      }
    });
  }

  on<T = unknown>(eventType: WebSocketEventType, handler: WebSocketEventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler as WebSocketEventHandler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(eventType)?.delete(handler as WebSocketEventHandler);
    };
  }

  onAny(handler: WebSocketEventHandler): () => void {
    this.globalHandlers.add(handler);
    return () => {
      this.globalHandlers.delete(handler);
    };
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
let wsService: WebSocketService | null = null;

export function getWebSocketService(): WebSocketService {
  if (!wsService) {
    wsService = new WebSocketService();
  }
  return wsService;
}
