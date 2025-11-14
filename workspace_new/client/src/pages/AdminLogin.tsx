import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  // Debug: Log component mount
  console.log('[AdminLogin] Component mounted');

  const loginMutation = useMutation({
    mutationFn: async () => {
      console.log('[AdminLogin] Starting login attempt for:', username);
      
      // Ensure we have credentials
      if (!username || !password) {
        throw new Error('Username and password are required');
      }
      
      // Build the full URL for production compatibility
      const baseUrl = window.location.origin;
      const requestUrl = `${baseUrl}/api/admin/login`;
      const requestBody = { username, password };
      
      console.log('[AdminLogin] Making POST request to:', requestUrl);
      
      try {
        // Use direct fetch to have more control
        const response = await fetch(requestUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(requestBody),
          credentials: 'same-origin', // Use same-origin for production
          mode: 'same-origin',
        });
        
        console.log('[AdminLogin] Response status:', response.status);
        
        if (!response.ok) {
          let errorMsg = `Login failed with status ${response.status}`;
          try {
            const errorData = await response.json();
            errorMsg = errorData.error || errorData.message || errorMsg;
          } catch {
            // If JSON parsing fails, try text
            const errorText = await response.text();
            if (errorText) errorMsg = errorText;
          }
          console.error('[AdminLogin] Error response:', errorMsg);
          throw new Error(errorMsg);
        }
        
        const data = await response.json();
        console.log('[AdminLogin] Login successful, received token:', !!data.token);
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        return data;
      } catch (error) {
        console.error('[AdminLogin] Login error:', error);
        // Handle network errors specifically
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error('Network error - please check your connection');
        }
        throw error instanceof Error ? error : new Error('Login failed');
      }
    },
    onSuccess: (data) => {
      console.log('[AdminLogin] Login successful, storing token and redirecting');
      // Store admin token
      const token = data.token;
      if (token) {
        localStorage.setItem("adminToken", token);
        console.log('[AdminLogin] Token stored, redirecting to dashboard');
      } else {
        console.error('[AdminLogin] No token received in response');
      }
      toast({
        title: "Login successful",
        description: "Welcome to the admin panel",
      });
      setLocation("/admin-dashboard");
    },
    onError: (error: any) => {
      console.error('[AdminLogin] Login error:', error);
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    // Always prevent default form submission
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('[AdminLogin] Login button clicked - starting login process');
    console.log('[AdminLogin] Username:', username, 'Password length:', password?.length || 0);
    
    if (!username || !password) {
      console.log('[AdminLogin] Validation failed - missing credentials');
      toast({
        title: "Validation Error",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }
    
    // Prevent multiple submissions
    if (loginMutation.isPending) {
      console.log('[AdminLogin] Already logging in, ignoring duplicate submission');
      return;
    }
    
    console.log('[AdminLogin] Validation passed, starting mutation');
    try {
      await loginMutation.mutateAsync();
    } catch (error) {
      console.error('[AdminLogin] Error calling mutate:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-[10px]">Admin Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the admin panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                data-testid="input-admin-username"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && username && password) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                data-testid="input-admin-password"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && username && password) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending || !username || !password}
              data-testid="button-admin-login"
              onClick={(e) => {
                console.log('[AdminLogin] Button clicked - calling handleSubmit');
                // Prevent default and handle submission
                e.preventDefault();
                handleSubmit(e);
              }}
            >
              {loginMutation.isPending ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}