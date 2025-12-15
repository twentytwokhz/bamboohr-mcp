// BambooHR API Client Service

import { BambooHRConfig, ApiError } from '../types.js';
import { API_VERSION } from '../constants.js';

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

export class BambooHRClient {
  private apiKey: string;
  private companyDomain: string;
  private baseUrl: string;
  private cache: Map<string, CacheEntry>;
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor(config: BambooHRConfig) {
    this.apiKey = config.apiKey;
    this.companyDomain = config.companyDomain;
    this.baseUrl = `https://${this.companyDomain}.bamboohr.com/api/${API_VERSION}`;
    this.cache = new Map();
  }

  private getCacheKey(endpoint: string, queryParams?: Record<string, string | number | boolean>): string {
    const params = queryParams ? JSON.stringify(queryParams) : '';
    return `${endpoint}${params}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getAuthHeader(): string {
    // BambooHR uses Basic Auth with API key as username and 'x' as password
    const credentials = Buffer.from(`${this.apiKey}:x`).toString('base64');
    return `Basic ${credentials}`;
  }

  private getHeaders(contentType: string = 'application/json'): Record<string, string> {
    return {
      'Authorization': this.getAuthHeader(),
      'Accept': 'application/json',
      'Content-Type': contentType
    };
  }

  async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown,
    queryParams?: Record<string, string | number | boolean>,
    maxRetries: number = 3
  ): Promise<T> {
    // Check cache for GET requests
    if (method === 'GET') {
      const cacheKey = this.getCacheKey(endpoint, queryParams);
      const cached = this.getFromCache<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    let lastError: ApiError | null = null;
    let retryDelay = 1000; // Start with 1 second

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        let url = `${this.baseUrl}${endpoint}`;

        // Add query parameters
        if (queryParams) {
          const params = new URLSearchParams();
          Object.entries(queryParams).forEach(([key, value]) => {
            params.append(key, String(value));
          });
          url += `?${params.toString()}`;
        }

        const options: RequestInit = {
          method,
          headers: this.getHeaders(),
        };

        if (body && (method === 'POST' || method === 'PUT')) {
          options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);

        // Handle error responses
        if (!response.ok) {
          const errorMessage = response.headers.get('X-BambooHR-Error-Message') ||
                             `HTTP ${response.status}: ${response.statusText}`;

          const error: ApiError = {
            error: 'API_ERROR',
            message: errorMessage,
            status: response.status
          };

          // Handle rate limiting with retry
          if (response.status === 429 || response.status === 503) {
            const retryAfter = response.headers.get('Retry-After');
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : retryDelay;

            if (attempt < maxRetries) {
              error.message = `Rate limit exceeded. Retrying after ${waitTime / 1000} seconds... (Attempt ${attempt + 1}/${maxRetries})`;
              console.error(error.message);

              lastError = error;
              await this.sleep(waitTime);

              // Exponential backoff with jitter
              retryDelay = Math.min(retryDelay * 2 + Math.random() * 1000, 8000);
              continue;
            } else {
              error.message = 'Rate limit exceeded. Maximum retry attempts reached. Please try again later.';
            }
          } else if (response.status === 401) {
            error.message = 'Authentication failed. The API key is invalid or has been revoked. Please verify BAMBOOHR_API_KEY in your .env file and ensure the key is still active in BambooHR → API Keys settings.';
          } else if (response.status === 403) {
            error.message = 'Access forbidden. The user associated with this API key lacks permissions for this resource. Generate a new API key with an admin or appropriately permissioned user.';
          } else if (response.status === 404) {
            error.message = 'Resource not found. Verify the employee ID or resource identifier is correct.';
          }

          throw error;
        }

        // Handle empty responses
        const contentType = response.headers.get('content-type');
        if (!contentType || response.status === 204) {
          return {} as T;
        }

        // Parse JSON response
        if (contentType.includes('application/json')) {
          const data = await response.json() as T;

          // Cache GET requests
          if (method === 'GET') {
            const cacheKey = this.getCacheKey(endpoint, queryParams);
            this.setCache(cacheKey, data);
          }

          return data;
        }

        // Handle text responses
        const text = await response.text();
        return text as unknown as T;

      } catch (error) {
        // If it's an API error and not rate limit, throw immediately
        if ((error as ApiError).error && (error as ApiError).status !== 429 && (error as ApiError).status !== 503) {
          throw error;
        }

        lastError = error as ApiError;

        // If we've exhausted retries, throw the last error
        if (attempt === maxRetries) {
          if (!lastError) {
            throw {
              error: 'NETWORK_ERROR',
              message: `Failed to connect to BambooHR API: ${(error as Error).message}`
            } as ApiError;
          }
          throw lastError;
        }
      }
    }

    // Fallback (should never reach here)
    throw lastError || {
      error: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred'
    } as ApiError;
  }

  // Convenience methods for common request types
  async get<T>(endpoint: string, queryParams?: Record<string, string | number | boolean>): Promise<T> {
    return this.makeRequest<T>(endpoint, 'GET', undefined, queryParams);
  }

  async post<T>(endpoint: string, body: unknown, queryParams?: Record<string, string | number | boolean>): Promise<T> {
    return this.makeRequest<T>(endpoint, 'POST', body, queryParams);
  }

  async put<T>(endpoint: string, body: unknown, queryParams?: Record<string, string | number | boolean>): Promise<T> {
    return this.makeRequest<T>(endpoint, 'PUT', body, queryParams);
  }

  async delete<T>(endpoint: string, queryParams?: Record<string, string | number | boolean>): Promise<T> {
    return this.makeRequest<T>(endpoint, 'DELETE', undefined, queryParams);
  }

  // Special method for reports which can return different formats
  async getReport(endpoint: string, format: 'json' | 'xml' | 'csv' = 'json'): Promise<unknown> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.getHeaders();

    if (format === 'xml') {
      headers['Accept'] = 'application/xml';
    } else if (format === 'csv') {
      headers['Accept'] = 'text/csv';
    }

    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) {
      const errorMessage = response.headers.get('X-BambooHR-Error-Message') ||
                         `HTTP ${response.status}: ${response.statusText}`;
      throw {
        error: 'API_ERROR',
        message: errorMessage,
        status: response.status
      } as ApiError;
    }

    if (format === 'json') {
      return await response.json();
    }

    return await response.text();
  }

  // Upload file using multipart form data
  async uploadFile(
    endpoint: string,
    fileData: Buffer | string,
    fileName: string,
    categoryId?: string
  ): Promise<{ id?: string }> {
    const url = `${this.baseUrl}${endpoint}`;

    // Create boundary for multipart form data
    const boundary = `----BambooHRFormBoundary${Date.now()}`;

    // Convert file data to Buffer if it's base64 string
    const fileBuffer = typeof fileData === 'string'
      ? Buffer.from(fileData, 'base64')
      : fileData;

    // Detect content type from file extension
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const contentTypeMap: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'txt': 'text/plain',
    };
    const fileContentType = contentTypeMap[extension] || 'application/octet-stream';

    // Build multipart form data manually
    let body = '';

    // Add file field
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
    body += `Content-Type: ${fileContentType}\r\n\r\n`;

    // Add category field if provided
    let categoryPart = '';
    if (categoryId) {
      categoryPart = `--${boundary}\r\n`;
      categoryPart += `Content-Disposition: form-data; name="category"\r\n\r\n`;
      categoryPart += `${categoryId}\r\n`;
    }

    // Combine parts with binary file data
    const prefixBuffer = Buffer.from(body, 'utf-8');
    const suffixBuffer = Buffer.from(`\r\n${categoryPart}--${boundary}--\r\n`, 'utf-8');
    const fullBody = Buffer.concat([prefixBuffer, fileBuffer, suffixBuffer]);

    const headers: Record<string, string> = {
      'Authorization': this.getAuthHeader(),
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': fullBody.length.toString()
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: fullBody
    });

    if (!response.ok) {
      const errorMessage = response.headers.get('X-BambooHR-Error-Message') ||
                         `HTTP ${response.status}: ${response.statusText}`;
      throw {
        error: 'API_ERROR',
        message: errorMessage,
        status: response.status
      } as ApiError;
    }

    // BambooHR returns the file ID in Location header
    const location = response.headers.get('Location');
    const fileId = location ? location.split('/').pop() : undefined;

    return { id: fileId };
  }

  // Upload photo (binary data)
  async uploadPhoto(endpoint: string, photoData: Buffer | string): Promise<void> {
    const url = `${this.baseUrl}${endpoint}`;

    // Convert base64 to buffer if needed
    const photoBuffer = typeof photoData === 'string'
      ? Buffer.from(photoData, 'base64')
      : photoData;

    const headers: Record<string, string> = {
      'Authorization': this.getAuthHeader(),
      'Content-Type': 'image/jpeg',
      'Content-Length': photoBuffer.length.toString()
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: photoBuffer
    });

    if (!response.ok) {
      const errorMessage = response.headers.get('X-BambooHR-Error-Message') ||
                         `HTTP ${response.status}: ${response.statusText}`;
      throw {
        error: 'API_ERROR',
        message: errorMessage,
        status: response.status
      } as ApiError;
    }
  }
}
