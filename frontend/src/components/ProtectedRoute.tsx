import { useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  useAuthStore,
  selectIsAuthenticated,
  selectUser,
  selectIsLoading,
  selectIsInitialized,
} from '@/stores/auth-store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  // ✅ Use Zustand selectors for optimized re-renders
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const user = useAuthStore(selectUser);
  const isLoading = useAuthStore(selectIsLoading);
  const isInitialized = useAuthStore(selectIsInitialized);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const [, setLocation] = useLocation();

  // Initialize auth on mount
  useEffect(() => {
    if (!isInitialized) {
      initializeAuth();
    }
  }, [isInitialized, initializeAuth]);

  // Wait for auth initialization
  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    setLocation('/login');
    return null;
  }

  // Check required role
  if (requiredRole && user?.role !== requiredRole) {
    setLocation('/dashboard');
    return null;
  }

  return <>{children}</>;
}
