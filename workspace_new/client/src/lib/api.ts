export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  // Get token from localStorage for Telegram WebApp
  const token = localStorage.getItem('auth_token');
  
  const headers: Record<string, string> = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!response.ok) {
    const text = await response.text();
    let errorMessage: string;
    
    try {
      const errorData = JSON.parse(text);
      errorMessage = errorData.error || errorData.message || response.statusText;
    } catch {
      errorMessage = text || response.statusText;
    }
    
    throw new Error(errorMessage);
  }

  return response;
}
