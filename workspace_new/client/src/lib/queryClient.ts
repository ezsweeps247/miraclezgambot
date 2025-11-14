import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: RequestInit,
): Promise<Response> {
  // Check if this is an admin route
  const isAdminRoute = url.includes('/api/admin');
  
  // Get appropriate token based on route type with defensive cleaning
  let token: string | null = null;
  if (isAdminRoute) {
    const rawToken = localStorage.getItem('adminToken');
    // Clean up token - remove quotes and whitespace
    token = rawToken ? rawToken.replace(/^["']|["']$/g, '').trim() : null;
    // Validate JWT format (should have 3 parts separated by dots)
    if (token && token.split('.').length !== 3) {
      console.error('Invalid JWT token format');
      token = null;
    }
  } else {
    token = localStorage.getItem('auth_token');
  }
  
  const headers: Record<string, string> = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      ...options, // Allow additional options like signal for abort controller
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    console.error(`API request failed for ${method} ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Build the URL from query key
    const url = queryKey.join("/") as string;
    
    // Check if this is an admin route
    const isAdminRoute = url.includes('/api/admin');
    
    // Get appropriate token based on route type with defensive cleaning
    let token: string | null = null;
    if (isAdminRoute) {
      const rawToken = localStorage.getItem('adminToken');
      // Clean up token - remove quotes and whitespace
      token = rawToken ? rawToken.replace(/^["']|["']$/g, '').trim() : null;
      // Validate JWT format (should have 3 parts separated by dots)
      if (token && token.split('.').length !== 3) {
        console.error('Invalid JWT token format');
        token = null;
      }
    } else {
      token = localStorage.getItem('auth_token');
    }
      
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const res = await fetch(queryKey.join("/") as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
