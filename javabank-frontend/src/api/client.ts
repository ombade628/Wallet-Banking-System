import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// ---------------------------------------------------------------------------
// Base client
// ---------------------------------------------------------------------------
export const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30_000,
});

const isDev = import.meta.env.DEV;

// ---------------------------------------------------------------------------
// Request interceptor: auth + correlation id
// ---------------------------------------------------------------------------
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('jwt');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Correlation id — backend logs will show the same value
  if (!config.headers['X-Request-ID']) {
    config.headers['X-Request-ID'] =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
  if (isDev) {
    // eslint-disable-next-line no-console
    console.debug(`[api →] ${config.method?.toUpperCase()} ${config.url}`, config.data ?? '');
  }
  return config;
});

// ---------------------------------------------------------------------------
// Response interceptor: log, retry, redirect
// ---------------------------------------------------------------------------
const RETRY_LIMIT = 3;
const RETRY_DELAY_MS = 400;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isNetworkError = (err: AxiosError) =>
  !err.response && !!err.request; // no response but request sent → network/timeout

const shouldRetry = (err: AxiosError, attempt: number) => {
  if (attempt >= RETRY_LIMIT) return false;
  if (isNetworkError(err)) return true;               // network flake / timeout
  const status = err.response?.status ?? 0;
  // Retry only transient server errors
  return status === 502 || status === 503 || status === 504 || status === 429;
};

client.interceptors.response.use(
  (r: AxiosResponse) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.debug(`[api ←] ${r.status} ${r.config.method?.toUpperCase()} ${r.config.url}`, r.data);
    }
    return r;
  },
  async (err: AxiosError) => {
    const cfg = err.config as InternalAxiosRequestConfig & {
      __retryCount?: number;
    };
    if (!cfg) return Promise.reject(err);

    const attempt = cfg.__retryCount ?? 0;

    // ---- retry transient errors ----
    if (shouldRetry(err, attempt)) {
      cfg.__retryCount = attempt + 1;
      // exponential-ish backoff: 400ms, 800ms, 1600ms
      await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
      return client.request(cfg);
    }

    // ---- 401: clear token, redirect to login hash ----
    if (err.response?.status === 401) {
      localStorage.removeItem('jwt');
      // hash routing — avoids full reload
      if (window.location.hash !== '#/login') {
        window.location.hash = '#/login';
      }
    }

    // ---- normalize error message ----
    const data = err.response?.data as any;
    const message =
      (typeof data === 'string' && data) ||
      data?.message ||
      data?.error ||
      err.message ||
      'Request failed';

    // Reject with a friendly Error so callers get `e.message`
    const wrapped = new Error(message) as Error & {
      status?: number;
      data?: any;
      original?: AxiosError;
    };
    wrapped.status = err.response?.status;
    wrapped.data = data;
    wrapped.original = err;

    if (isDev) {
      // eslint-disable-next-line no-console
      console.error(`[api !] ${err.response?.status ?? 'NETWORK'} ${cfg.method?.toUpperCase()} ${cfg.url}:`, message);
    }

    return Promise.reject(wrapped);
  }
);