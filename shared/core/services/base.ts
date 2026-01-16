// Base service infrastructure

export interface ServiceConfig {
  baseUrl?: string;
  getBaseUrl?: () => string | Promise<string>;
  fetch?: typeof fetch;
}

// Global configuration - can be set once at app startup
let globalConfig: ServiceConfig = {
  baseUrl: '/api',
};

export function configureServices(config: ServiceConfig): void {
  globalConfig = { ...globalConfig, ...config };
}

export function getServiceConfig(): ServiceConfig {
  return globalConfig;
}

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

  protected async request<T>(path: string, options?: RequestInit): Promise<T> {
    const baseUrl = await this.getBaseUrl();
    const response = await this.fetchFn(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
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
