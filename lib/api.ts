export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function fetchApi<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(data.error || data.message || "Something went wrong", res.status);
  }

  return data;
}

// Convenience helpers
export async function apiGet<T>(url: string): Promise<ApiResponse<T>> {
  return fetchApi<T>(url, { method: "GET" });
}

export async function apiPost<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  return fetchApi<T>(url, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiPut<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  return fetchApi<T>(url, {
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<ApiResponse<T>> {
  return fetchApi<T>(url, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete<T>(url: string): Promise<ApiResponse<T>> {
  return fetchApi<T>(url, { method: "DELETE" });
}
