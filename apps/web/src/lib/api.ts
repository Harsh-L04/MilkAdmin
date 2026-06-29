import type {
  AuthTokens,
  ProductDto,
  ListProductsQuery,
  CreateOrderInput,
  ReviewOrderInput,
  AdvanceOrderInput,
  OrderStatus,
  OutletLedgerDto,
  RecordCollectionInput,
} from '@moderns-milk/contracts';
import { clearTokens, getTokens, setTokens } from './tokens';

/** Same-origin proxy prefix — Next rewrites this to the NestJS API. */
const BASE = '/bff';

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
}

function messageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message: unknown }).message;
    if (typeof m === 'string') return m;
    if (Array.isArray(m) && m.length) return String(m[0]);
  }
  return fallback;
}

async function rawRequest<T>(path: string, opts: RequestOptions): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.auth !== false) {
    const tokens = getTokens();
    if (tokens?.accessToken) headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    throw new ApiError(res.status, messageFromBody(data, res.statusText), data);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// --- token refresh (single-flight) ----------------------------------------
let refreshing: Promise<AuthTokens | null> | null = null;

async function tryRefresh(): Promise<AuthTokens | null> {
  const tokens = getTokens();
  if (!tokens?.refreshToken) return null;
  if (!refreshing) {
    refreshing = rawRequest<AuthTokens>('/auth/refresh', {
      method: 'POST',
      auth: false,
      body: { refreshToken: tokens.refreshToken },
    })
      .then((next) => {
        setTokens(next);
        return next;
      })
      .catch(() => {
        clearTokens();
        return null;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

/** Authenticated request with one transparent refresh-and-retry on 401. */
async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  try {
    return await rawRequest<T>(path, opts);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && opts.auth !== false) {
      const refreshed = await tryRefresh();
      if (refreshed) return rawRequest<T>(path, opts);
    }
    throw err;
  }
}

// --- DTOs the API returns (decimals serialized as strings) ------------------
export interface OrderItemDto {
  id: string;
  orderId: string;
  productId: string;
  unitPrice: string;
  qtyOrdered: string;
  qtyApproved: string | null;
  qtyDispatched: string | null;
  qtyDelivered: string | null;
  qtyReturned: string;
  returnReason: string | null;
}

export interface OrderDto {
  id: string;
  retailerId: string;
  distributorId: string;
  orderWindowId: string;
  deliveryDate: string;
  status: OrderStatus;
  source: 'STANDING' | 'MANUAL';
  approvalType: 'AUTO' | 'MANUAL' | null;
  approvedById: string | null;
  subtotal: string;
  taxTotal: string;
  total: string;
  items: OrderItemDto[];
  /** Customer who placed the order (shop + mobile number). */
  retailer?: {
    shopName: string;
    user: { name: string; phone: string } | null;
  } | null;
  createdAt: string;
  updatedAt: string;
  reviewReasons?: string[];
}

function buildQuery(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

// --- public API surface (mirrors the NestJS controllers exactly) -----------
export const api = {
  auth: {
    requestOtp: (phone: string) =>
      request<{ message: string }>('/auth/otp/request', {
        method: 'POST',
        auth: false,
        body: { phone },
      }),
    verifyOtp: (phone: string, code: string) =>
      request<AuthTokens>('/auth/otp/verify', {
        method: 'POST',
        auth: false,
        body: { phone, code },
      }),
    logout: () => request<void>('/auth/logout', { method: 'POST' }),
  },
  catalog: {
    listProducts: (query: ListProductsQuery = {}, signal?: AbortSignal) =>
      request<ProductDto[]>(`/catalog/products${buildQuery(query)}`, { signal }),
  },
  orders: {
    list: (signal?: AbortSignal) => request<OrderDto[]>('/orders', { signal }),
    get: (id: string, signal?: AbortSignal) =>
      request<OrderDto>(`/orders/${id}`, { signal }),
    create: (input: CreateOrderInput) =>
      request<OrderDto>('/orders', { method: 'POST', body: input }),
    submit: (id: string) =>
      request<OrderDto>(`/orders/${id}/submit`, { method: 'POST' }),
    review: (input: ReviewOrderInput) =>
      request<OrderDto>('/orders/review', { method: 'POST', body: input }),
    advance: (input: AdvanceOrderInput) =>
      request<OrderDto>('/orders/advance', { method: 'POST', body: input }),
  },
  admin: {
    dashboard: (signal?: AbortSignal) =>
      request<DashboardStats>('/admin/dashboard', { signal }),
    distributors: (signal?: AbortSignal) =>
      request<DistributorRow[]>('/admin/distributors', { signal }),
    retailers: (signal?: AbortSignal) =>
      request<RetailerRow[]>('/admin/retailers', { signal }),
  },
  salesVisits: {
    list: (signal?: AbortSignal) =>
      request<SalesVisitRow[]>('/sales-visits', { signal }),
  },
  ledger: {
    get: (retailerId: string, signal?: AbortSignal) =>
      request<OutletLedgerDto>(`/customers/${retailerId}/ledger`, { signal }),
    collect: (input: RecordCollectionInput) =>
      request<OutletLedgerDto>('/collections', { method: 'POST', body: input }),
  },
};

export interface SalesVisitRow {
  id: string;
  date: string;
  salesOfficer: string;
  retailer: string;
  route: string | null;
  outletType: 'NEW' | 'EXISTING';
  inTime: string | null;
  bookingTime: string | null;
  competition: string | null;
  remarks: string | null;
  itemCount: number;
  orderId: string | null;
  orderTotal: string | null;
  createdAt: string;
}

export interface DashboardStats {
  network: { distributors: number; outlets: number; salesReps: number };
  dues: { outstanding: string; outletsWithDues: number };
  visits: {
    count: number;
    newOutlets: number;
    withOrder: number;
    strikeRatePct: number;
  };
  topSkus: { productId: string; name: string; qty: number; value: string }[];
}

// --- Registry DTOs (company-wide directory) --------------------------------
export interface DistributorRow {
  id: string;
  name: string;
  code: string;
  region: string | null;
  address: string | null;
  status: string;
  outlets: number;
  routes: number;
}

export interface RetailerRow {
  id: string;
  outletName: string;
  contactName: string | null;
  phone: string | null;
  whatsapp: string | null;
  route: string | null;
  distributor: string | null;
  salesOfficer: string | null;
  outletType: 'NEW' | 'EXISTING';
  paymentTerms: string | null;
  gstin: string | null;
  address: string | null;
  balance: string;
  creditLimit: string;
  status: string;
  createdAt: string;
}
