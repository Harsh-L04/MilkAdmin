import type {
  AuthTokens,
  ProductDto,
  ListProductsQuery,
  UpsertProductInput,
  UpdateProductInput,
  CreateOrderInput,
  ReviewOrderInput,
  AdvanceOrderInput,
  OrderStatus,
  OutletLedgerDto,
  RecordCollectionInput,
  CustomerDto,
  UpdateCustomerInput,
  OnboardedUserRow,
  OnboardDistributorInput,
  OnboardRetailerInput,
  OnboardStaffInput,
  UpdateOnboardingInput,
  SampleOrderDto,
  CreateSampleOrderInput,
  PaymentLogDto,
  CreatePaymentInput,
  UpdatePaymentStatusInput,
  OrderSummaryDto,
  OrderDeadlineDto,
  OrderDeadlineInput,
  StandingOrderDto,
  UpsertStandingOrderInput,
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
  const isFormData = opts.body instanceof FormData;
  if (opts.body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';
  if (opts.auth !== false) {
    const tokens = getTokens();
    if (tokens?.accessToken) headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  const body = isFormData ? (opts.body as FormData) : opts.body !== undefined ? JSON.stringify(opts.body) : undefined;
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body,
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
  // The refresh token is an httpOnly cookie sent automatically (same-origin
  // /bff). No body needed; a missing/invalid cookie simply yields a 401.
  if (!refreshing) {
    refreshing = rawRequest<AuthTokens>('/auth/refresh', {
      method: 'POST',
      auth: false,
      body: {},
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
  orderType?: 'RETAILER' | 'SELF';
  approvalType: 'AUTO' | 'MANUAL' | null;
  approvedById: string | null;
  // Review metadata (spec §4.1.5).
  approvedBy?: { name: string } | null;
  rejectedById?: string | null;
  rejectedBy?: { name: string } | null;
  rejectReason?: string | null;
  reviewedAt?: string | null;
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
    createProduct: (input: UpsertProductInput) =>
      request<ProductDto>('/catalog/products', { method: 'POST', body: input }),
    updateProduct: (id: string, input: UpdateProductInput) =>
      request<ProductDto>(`/catalog/products/${id}`, { method: 'PATCH', body: input }),
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
    forceLogout: (userId: string) =>
      request<{ message: string }>(`/admin/users/${userId}/force-logout`, { method: 'POST' }),
    unlinkedUsers: (signal?: AbortSignal) =>
      request<UnlinkedUserRow[]>('/admin/users/unlinked', { signal }),
    linkUser: (userId: string, distributorId: string) =>
      request<{ message: string }>(`/admin/users/${userId}/link`, {
        method: 'POST',
        body: { distributorId },
      }),
    updateDistributor: (id: string, body: { name?: string; code?: string; region?: string; address?: string; status?: string }) =>
      request<{ message: string }>(`/admin/distributors/${id}`, {
        method: 'PATCH',
        body,
      }),
  },
  files: {
    upload: (file: File, signal?: AbortSignal) => {
      const formData = new FormData();
      formData.append('file', file);
      return request<{ key: string; url: string; originalName: string; mimeType: string; size: number }>(
        '/files/upload',
        { method: 'POST', body: formData, signal },
      );
    },
    presignedUpload: (originalName: string) =>
      request<{ key: string; url: string }>('/files/presigned-upload', {
        method: 'POST',
        body: { originalName },
      }),
    getUrl: (key: string) =>
      request<string>(`/files/${key}`, {}),
  },
  retailers: {
    update: (id: string, input: UpdateCustomerInput) =>
      request<CustomerDto>(`/customers/${id}`, { method: 'PATCH', body: input }),
  },
  onboarding: {
    listDistributors: (search?: string, signal?: AbortSignal) =>
      request<OnboardedUserRow[]>(`/onboarding/distributors${buildQuery({ search })}`, { signal }),
    listRetailers: (search?: string, signal?: AbortSignal) =>
      request<OnboardedUserRow[]>(`/onboarding/retailers${buildQuery({ search })}`, { signal }),
    listSalesHeads: (search?: string, signal?: AbortSignal) =>
      request<OnboardedUserRow[]>(`/onboarding/sales-heads${buildQuery({ search })}`, { signal }),
    listSalesOfficers: (search?: string, signal?: AbortSignal) =>
      request<OnboardedUserRow[]>(`/onboarding/sales-officers${buildQuery({ search })}`, { signal }),
    onboardDistributor: (input: OnboardDistributorInput) =>
      request<{ id: string }>('/onboarding/distributors', { method: 'POST', body: input }),
    onboardRetailer: (input: OnboardRetailerInput) =>
      request<{ id: string }>('/onboarding/retailers', { method: 'POST', body: input }),
    onboardStaff: (input: OnboardStaffInput) =>
      request<{ id: string }>('/onboarding/staff', { method: 'POST', body: input }),
    updateDistributorStatus: (id: string, input: UpdateOnboardingInput) =>
      request<unknown>(`/onboarding/distributors/${id}/status`, { method: 'PATCH', body: input }),
    updateRetailerStatus: (id: string, input: UpdateOnboardingInput) =>
      request<unknown>(`/onboarding/retailers/${id}/status`, { method: 'PATCH', body: input }),
  },
  salesVisits: {
    list: (filters: { dateFrom?: string; dateTo?: string; outletType?: string } = {}, signal?: AbortSignal) =>
      request<SalesVisitRow[]>(`/sales-visits${buildQuery(filters)}`, { signal }),
  },
  sampleOrders: {
    list: (filters: { search?: string; date?: string } = {}, signal?: AbortSignal) =>
      request<SampleOrderDto[]>(`/sample-orders${buildQuery(filters)}`, { signal }),
    create: (input: CreateSampleOrderInput) =>
      request<SampleOrderDto>('/sample-orders', { method: 'POST', body: input }),
  },
  payments: {
    list: (filters: { status?: string; distributorId?: string; dateFrom?: string; dateTo?: string } = {}, signal?: AbortSignal) =>
      request<PaymentLogDto[]>(`/payments${buildQuery(filters)}`, { signal }),
    create: (input: CreatePaymentInput) =>
      request<PaymentLogDto>('/payments', { method: 'POST', body: input }),
    updateStatus: (id: string, input: UpdatePaymentStatusInput) =>
      request<PaymentLogDto>(`/payments/${id}/status`, { method: 'PATCH', body: input }),
  },
  reports: {
    orderSummary: (date: string | undefined, signal?: AbortSignal) =>
      request<OrderSummaryDto>(`/reports/order-summary${buildQuery({ date })}`, { signal }),
  },
  settings: {
    getOrderDeadline: (signal?: AbortSignal) =>
      request<OrderDeadlineDto>('/settings/order-deadline', { signal }),
    setOrderDeadline: (input: OrderDeadlineInput) =>
      request<OrderDeadlineDto>('/settings/order-deadline', { method: 'PUT', body: input }),
  },
  ledger: {
    get: (retailerId: string, signal?: AbortSignal) =>
      request<OutletLedgerDto>(`/customers/${retailerId}/ledger`, { signal }),
    collect: (input: RecordCollectionInput) =>
      request<OutletLedgerDto>('/collections', { method: 'POST', body: input }),
  },
  standingOrders: {
    list: (signal?: AbortSignal) =>
      request<StandingOrderDto[]>('/standing-orders', { signal }),
    create: (input: UpsertStandingOrderInput) =>
      request<StandingOrderDto>('/standing-orders', { method: 'POST', body: input }),
    update: (id: string, input: UpsertStandingOrderInput) =>
      request<StandingOrderDto>(`/standing-orders/${id}`, { method: 'PATCH', body: input }),
    delete: (id: string) =>
      request<void>(`/standing-orders/${id}`, { method: 'DELETE' }),
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

export interface UnlinkedUserRow {
  id: string;
  name: string;
  phone: string;
  role: 'SALES_OFFICER' | 'DISTRIBUTOR';
  area: string | null;
  createdAt: string;
}
