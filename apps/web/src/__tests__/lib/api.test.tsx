import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, ApiError } from '@/lib/api';
import * as tokens from '@/lib/tokens';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 401 ? 'Unauthorized' : 'Error',
    headers: new Headers({ 'content-type': 'application/json' }),
    text: () => Promise.resolve(body ? JSON.stringify(body) : ''),
    json: () => Promise.resolve(body),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    get length() { return 0; },
    key: () => null,
  });
});

describe('api.auth', () => {
  it('requestOtp sends POST to /bff/auth/otp/request', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { message: 'OTP sent' }));
    const result = await api.auth.requestOtp('+919999999999');
    expect(result).toEqual({ message: 'OTP sent' });
    expect(mockFetch).toHaveBeenCalledWith(
      '/bff/auth/otp/request',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ phone: '+919999999999' }) }),
    );
  });

  it('verifyOtp sends POST with phone and code', async () => {
    const authTokens = { accessToken: 'access', refreshToken: 'refresh' };
    mockFetch.mockResolvedValue(mockResponse(200, authTokens));
    const result = await api.auth.verifyOtp('+919999999999', '123456');
    expect(result).toEqual(authTokens);
    expect(mockFetch).toHaveBeenCalledWith(
      '/bff/auth/otp/verify',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ phone: '+919999999999', code: '123456' }) }),
    );
  });

  it('logout sends POST', async () => {
    mockFetch.mockResolvedValue(mockResponse(204, undefined));
    const result = await api.auth.logout();
    expect(result).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith('/bff/auth/logout', expect.objectContaining({ method: 'POST' }));
  });
});

describe('api.catalog', () => {
  it('listProducts sends GET with query params', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, []));
    await api.catalog.listProducts({ category: 'MILK', active: true });
    expect(mockFetch).toHaveBeenCalledWith(
      '/bff/catalog/products?category=MILK&active=true',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('listProducts omits undefined/null/empty params', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, []));
    await api.catalog.listProducts({});
    const call = mockFetch.mock.calls[0][0] as string;
    expect(call).toBe('/bff/catalog/products');
  });

  it('createProduct sends POST with body', async () => {
    const input = { name: 'Gold Milk', sku: 'GOLD-1L', category: 'MILK' as const, uom: 'LITRE' as const };
    mockFetch.mockResolvedValue(mockResponse(201, { id: '1', ...input, active: true }));
    const result = await api.catalog.createProduct(input as any);
    expect(result).toHaveProperty('id');
    expect(mockFetch).toHaveBeenCalledWith(
      '/bff/catalog/products',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(input) }),
    );
  });

  it('updateProduct sends PATCH', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { id: '1', name: 'Updated' }));
    await api.catalog.updateProduct('1', { name: 'Updated' as any });
    expect(mockFetch).toHaveBeenCalledWith(
      '/bff/catalog/products/1',
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});

describe('api.orders', () => {
  it('list sends GET', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, []));
    await api.orders.list();
    expect(mockFetch).toHaveBeenCalledWith('/bff/orders', expect.objectContaining({ method: 'GET' }));
  });

  it('get sends GET with ID', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { id: '1' }));
    const result = await api.orders.get('1');
    expect(result).toEqual({ id: '1' });
  });

  it('create sends POST', async () => {
    mockFetch.mockResolvedValue(mockResponse(201, { id: '1' }));
    await api.orders.create({} as any);
    expect(mockFetch).toHaveBeenCalledWith('/bff/orders', expect.objectContaining({ method: 'POST' }));
  });

  it('submit sends POST submit endpoint', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { id: '1', status: 'SUBMITTED' }));
    await api.orders.submit('1');
    expect(mockFetch).toHaveBeenCalledWith('/bff/orders/1/submit', expect.objectContaining({ method: 'POST' }));
  });

  it('review sends POST review', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { id: '1' }));
    await api.orders.review({ orderId: '1', decision: 'APPROVE' });
    expect(mockFetch).toHaveBeenCalledWith('/bff/orders/review', expect.objectContaining({ method: 'POST' }));
  });

  it('advance sends POST advance', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, { id: '1' }));
    await api.orders.advance({ orderId: '1', status: 'IN_PRODUCTION' });
    expect(mockFetch).toHaveBeenCalledWith('/bff/orders/advance', expect.objectContaining({ method: 'POST' }));
  });
});

describe('token refresh on 401', () => {
  it('transparent retry on 401 when refresh succeeds', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify({ accessToken: 'expired', refreshToken: 'refreshable' }),
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      get length() { return 0; },
      key: () => null,
    });

    let callCount = 0;
    mockFetch.mockImplementation(async (url: string) => {
      callCount++;
      if (url.includes('/auth/refresh')) return mockResponse(200, { accessToken: 'new-token', refreshToken: 'new-refresh' });
      if (callCount === 1) return mockResponse(401, { message: 'Unauthorized' });
      return mockResponse(200, [{ id: '1' }]);
    });

    const result = await api.orders.list();
    expect(result).toEqual([{ id: '1' }]);
    // 1st call: original 401, 2nd: refresh, 3rd: retry
    expect(callCount).toBe(3);
  });

  it('401 + refresh fails -> error propagates', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => JSON.stringify({ accessToken: 'expired', refreshToken: 'refreshable' }),
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      get length() { return 0; },
      key: () => null,
    });

    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('/auth/refresh')) return mockResponse(401, { message: 'Refresh failed' });
      return mockResponse(401, { message: 'Unauthorized' });
    });

    await expect(api.orders.list()).rejects.toThrow(ApiError);
  });
});

describe('error handling', () => {
  it('non-401 errors throw ApiError', async () => {
    mockFetch.mockResolvedValue(mockResponse(404, { message: 'Not found' }));
    await expect(api.orders.list()).rejects.toMatchObject({ status: 404, message: 'Not found' });
  });

  it('network error throws', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(api.catalog.listProducts()).rejects.toThrow('Network failure');
  });
});

describe('204 response', () => {
  it('returns undefined', async () => {
    mockFetch.mockResolvedValue(mockResponse(204, undefined));
    const result = await api.auth.logout();
    expect(result).toBeUndefined();
  });
});

describe('query params built correctly', () => {
  it('builds correct URL from params', async () => {
    mockFetch.mockResolvedValue(mockResponse(200, []));
    await api.sampleOrders.list({ search: 'test', date: '2024-01-01' });
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('search=test');
    expect(url).toContain('date=2024-01-01');
  });
});
