// Base service infrastructure

export interface ServiceConfig {
  baseUrl?: string;
  getBaseUrl?: () => string | Promise<string>;
  fetch?: typeof fetch;
  maxRetries?: number;
  baseRetryDelay?: number; // ms
}

// Global configuration - can be set once at app startup
let globalConfig: ServiceConfig = {
  baseUrl: '/api',
  maxRetries: 3,
  baseRetryDelay: 1000,
};

export function configureServices(config: ServiceConfig): void {
  globalConfig = { ...globalConfig, ...config };
}

export function getServiceConfig(): ServiceConfig {
  return globalConfig;
}

// Request deduplication cache for GET requests
interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

const pendingRequests = new Map<string, PendingRequest<unknown>>();
const REQUEST_DEDUP_WINDOW = 100; // ms - dedupe requests within this window

// Clean up old pending requests periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of pendingRequests.entries()) {
    if (now - value.timestamp > 5000) {
      pendingRequests.delete(key);
    }
  }
}, 10000);

export class BaseService {
  protected config: ServiceConfig;
  protected fetchFn: typeof fetch;

  constructor(config?: ServiceConfig) {
    this.config = config || globalConfig;
    this.fetchFn = this.config.fetch || ((...args) => fetch(...args));
  }

  protected async getBaseUrl(): Promise<string> {
    if (this.config.getBaseUrl) {
      return this.config.getBaseUrl();
    }
    return this.config.baseUrl || '/api';
  }

  private async executeRequest<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await this.fetchFn(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      return true; // Network error
    }
    if (error instanceof Error) {
      const message = error.message;
      // Retry on server errors (5xx) and some specific 4xx
      if (message.includes('HTTP 5') || message.includes('HTTP 429')) {
        return true;
      }
    }
    return false;
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries: number = this.config.maxRetries || 3,
    baseDelay: number = this.config.baseRetryDelay || 1000
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry if it's not a retryable error or we're out of retries
        if (!this.isRetryableError(error) || attempt === retries) {
          throw error;
        }

        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  protected async request<T>(path: string, options?: RequestInit): Promise<T> {
    const baseUrl = await this.getBaseUrl();
    const url = `${baseUrl}${path}`;
    const method = options?.method || 'GET';

    // Only deduplicate GET requests
    if (method === 'GET') {
      const cacheKey = url;
      const now = Date.now();
      const pending = pendingRequests.get(cacheKey);

      // Return existing promise if request is already in flight (within dedup window)
      if (pending && now - pending.timestamp < REQUEST_DEDUP_WINDOW) {
        return pending.promise as Promise<T>;
      }

      // Create new request with retry logic
      const promise = this.retryWithBackoff(() => this.executeRequest<T>(url, options));

      pendingRequests.set(cacheKey, { promise, timestamp: now });

      // Clean up after request completes
      promise.finally(() => {
        // Only delete if it's still our request
        const current = pendingRequests.get(cacheKey);
        if (current && current.promise === promise) {
          pendingRequests.delete(cacheKey);
        }
      });

      return promise;
    }

    // Non-GET requests: just retry, no deduplication
    return this.retryWithBackoff(() => this.executeRequest<T>(url, options));
  }

  protected get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  protected post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  protected put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  protected delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}
