import { clearAccessToken, getAccessToken } from './appState';
import { config } from './config';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function buildUrl(path: string): string {
  if (!config.api.baseURL) {
    return path;
  }

  return `${config.api.baseURL}${path}`;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { body?: unknown } = {}
): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(init.headers || {});

  if (!headers.has('Content-Type') && init.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
    body: init.body !== undefined && typeof init.body !== 'string'
      ? JSON.stringify(init.body)
      : (init.body as BodyInit | null | undefined),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      clearAccessToken();
    }

    throw new ApiError(
      data.error || data.message || 'Request failed.',
      response.status
    );
  }

  return data as T;
}
