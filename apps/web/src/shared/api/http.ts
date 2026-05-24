const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";

export type ApiEnvelope<T> = {
  data: T;
};

export async function apiGet<T>(path: string) {
  return request<T>(path, { method: "GET" });
}

export async function apiPost<T>(path: string, body: unknown) {
  return request<T>(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function apiPatch<T>(path: string, body: unknown) {
  return request<T>(path, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function apiPostForm<T>(path: string, body: FormData) {
  return request<T>(path, {
    method: "POST",
    body,
  });
}

export async function apiDelete<T>(path: string) {
  return request<T>(path, { method: "DELETE" });
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init);

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message = errorBody?.error?.message ?? `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
