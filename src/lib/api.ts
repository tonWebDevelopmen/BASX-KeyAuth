export interface ApiResponse<T = any> {
  data: T;
  error?: string;
  status: number;
}

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('keyauth_token');
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(endpoint, {
        ...options,
        headers,
      });

      let data: any;
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { text };
      }

      if (!res.ok) {
        return {
          data,
          error: data?.error || data?.message || `Request failed with status ${res.status}`,
          status: res.status,
        };
      }

      return { data, status: res.status };
    } catch (err: any) {
      return {
        data: null as any,
        error: err.message || 'Network error',
        status: 0,
      };
    }
  }

  get<T = any>(url: string) {
    return this.request<T>(url, { method: 'GET' });
  }

  post<T = any>(url: string, body?: any) {
    return this.request<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T = any>(url: string, body?: any) {
    return this.request<T>(url, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T = any>(url: string) {
    return this.request<T>(url, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
export default api;
