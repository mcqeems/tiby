const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status?: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Required for Better-Auth session cookies
  });

  const contentType = res.headers.get("content-type") || "";
  let data: unknown = null;
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const errorObj =
      typeof data === "object" && data !== null
        ? (data as Record<string, unknown>)
        : null;
    const code =
      (errorObj?.code as string) ||
      (res.status === 401 ? "UNAUTHORIZED" : "SERVER_ERROR");
    const message =
      (errorObj?.message as string) ||
      (typeof data === "string"
        ? data
        : `Request gagal dengan status ${res.status}`);
    throw new ApiError(code, message, res.status, errorObj?.details);
  }

  return data as T;
}
