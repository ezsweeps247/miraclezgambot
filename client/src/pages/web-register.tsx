import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import miraclezLogo from '@/assets/miraclez-logo.png';

export default function WebRegister() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setFormData(prev => ({ ...prev, email: decodeURIComponent(emailParam) }));
    }
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure your passwords match',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiRequest('POST', '/api/auth/web/register', {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      const response = await res.json();

      if (response.success) {
        toast({
          title: 'Account created!',
          description: 'Welcome to Miraclez Gaming',
        });
        setLocation('/');
      }
    } catch (error: any) {
      toast({
        title: 'Registration failed',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#1a0a2e] to-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img src={miraclezLogo} alt="Miraclez Gaming" className="h-20" data-testid="logo-miraclez" />
        </div>

        <div className="bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 shadow-2xl">
          <Button
            variant="ghost"
            onClick={() => setLocation('/auth')}
            className="mb-6 text-gray-400 hover:text-white -ml-2"
            data-testid="button-back"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to login options
          </Button>

          <div className="mb-8">
            <h2 className="text-white text-center mb-2 font-bold text-xl">
              Create your account
            </h2>
            <p className="text-gray-400 text-center text-sm">
              Enter your information to get started
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="firstName" className="text-sm font-medium text-gray-300">
                  First Name
                </label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  className="bg-black/40 border-gray-600 h-12 text-sm placeholder:text-gray-500 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  data-testid="input-firstname"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="lastName" className="text-sm font-medium text-gray-300">
                  Last Name
                </label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="bg-black/40 border-gray-600 h-12 text-sm placeholder:text-gray-500 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  data-testid="input-lastname"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-300">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="bg-black/40 border-gray-600 h-14 text-base placeholder:text-gray-500 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-300">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="bg-black/40 border-gray-600 h-14 text-base placeholder:text-gray-500 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                data-testid="input-password"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-300">
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                className="bg-black/40 border-gray-600 h-14 text-base placeholder:text-gray-500 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                data-testid="input-confirm-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold h-14 text-base rounded-xl shadow-lg transition-all mt-6"
              disabled={isLoading}
              data-testid="button-register"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-gray-400 text-sm">Already have an account? </span>
            <button
              onClick={() => setLocation('/login')}
              className="text-purple-400 hover:text-purple-300 font-medium text-sm hover:underline"
              data-testid="link-login"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
