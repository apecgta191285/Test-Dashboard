import { useState, useEffect } from 'react';
import { useAuthStore, selectIsLoading, selectError } from '@/stores/auth-store';
import { useLocation, useSearch } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, AlertTriangle } from 'lucide-react';
import { APP_LOGO, APP_TITLE } from '@/const';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const [, setLocation] = useLocation();
  const searchString = useSearch();

  // ✅ Use Zustand store
  const login = useAuthStore((state) => state.login);
  const clearError = useAuthStore((state) => state.clearError);
  const isLoading = useAuthStore(selectIsLoading);
  const storeError = useAuthStore(selectError);

  // Check for session expired query param
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    if (params.get('expired') === 'true') {
      setSessionExpired(true);
      toast.warning('Your session has expired. Please login again.');
    }
  }, [searchString]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSessionExpired(false);
    clearError();

    try {
      await login(email, password);
      toast.success('Login successful!');
      setLocation('/dashboard');
    } catch (err: any) {
      const errorData = err.response?.data;

      // ✅ Handle specific error types from Backend
      if (errorData?.error === 'ACCOUNT_LOCKED') {
        const lockoutMinutes = errorData.lockoutMinutes || 15;
        const message = `Account locked. Please try again in ${lockoutMinutes} minutes.`;
        setLocalError(message);
        toast.error(message);
      } else if (errorData?.remainingAttempts !== undefined) {
        const message = `Invalid credentials. ${errorData.remainingAttempts} attempts remaining.`;
        setLocalError(message);
        toast.warning(message);
      } else {
        const message = errorData?.message || 'Login failed. Please try again.';
        setLocalError(message);
        toast.error(message);
      }
    }
  };

  const displayError = localError || storeError;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="w-16 h-16 mx-auto mb-4" />}
          <h1 className="text-3xl font-bold">{APP_TITLE}</h1>
          <p className="text-muted-foreground mt-2">RGA Marketing Dashboard</p>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Session Expired Warning */}
              {sessionExpired && (
                <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                    Your session has expired. Please login again.
                  </AlertDescription>
                </Alert>
              )}

              {/* Error Alert */}
              {displayError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{displayError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                />
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setLocation('/forgot-password')}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <p className="text-muted-foreground">
                Don't have an account?{' '}
                <button
                  onClick={() => setLocation('/register')}
                  className="text-primary hover:underline font-medium"
                >
                  Register here
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
