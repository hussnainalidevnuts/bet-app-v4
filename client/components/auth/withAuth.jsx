'use client';

import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { selectIsAuthenticated, selectIsInitialized } from '@/lib/features/auth/authSlice';
import { Button } from '@/components/ui/button';
import { AlertTriangle, LogIn } from 'lucide-react';
import LoginDialog from './LoginDialog';

/**
 * Higher Order Component that protects routes requiring authentication
 * @param {React.Component} WrappedComponent - The component to protect
 * @param {Object} options - Configuration options
 * @param {boolean} options.redirectToHome - Whether to redirect to home page instead of showing login prompt
 * @returns {React.Component} Protected component
 */
const withAuth = (WrappedComponent, options = {}) => {
  const { redirectToHome = false } = options;

  const AuthProtectedComponent = (props) => {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const isInitialized = useSelector(selectIsInitialized);
    const router = useRouter();

    useEffect(() => {
      // Only redirect after auth check is complete
      if (isInitialized && !isAuthenticated && redirectToHome) {
        router.push('/');
      }
    }, [isAuthenticated, isInitialized, router]);    // Show loading while checking authentication
    if (!isInitialized) {
      return (
        <div className="min-h-[calc(100vh-148px)] flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 sm:h-24 sm:w-24 lg:h-32 lg:w-32 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-sm sm:text-base text-gray-600">Checking authentication...</p>
          </div>
        </div>
      );
    }// If not authenticated, show access denied message with login option
    if (!isAuthenticated) {
      return (
        <div className="min-h-[calc(100vh-148px)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg">
            <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 lg:p-10 text-center">
              {/* Icon */}
              <div className="mx-auto flex items-center justify-center h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-red-100 mb-4 sm:mb-6">
                <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
              </div>
              
              {/* Title */}
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
                Login Required
              </h1>
              
              {/* Description */}
              <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 leading-relaxed">
                You need to be logged in to access this page. Please log in to continue.
              </p>

              {/* Action buttons */}
              <div className="space-y-3 sm:space-y-4">
                <LoginDialog>
                  <Button className="w-full bg-base py-2.5 sm:py-2 hover:bg-base-dark !text-white font-medium flex items-center justify-center space-x-2 text-sm sm:text-base">
                    <LogIn className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>Log In</span>
                  </Button>
                </LoginDialog>
                
                <Button
                  variant="outline"
                  onClick={() => router.push('/')}
                  className="w-full !text-black  py-2.5 sm:py-2 hover:bg-gray-100 text-sm sm:text-base font-medium"
                >
                  Go to Home Page
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // User is authenticated, render the protected component
    return <WrappedComponent {...props} />;
  };

  // Set display name for debugging
  AuthProtectedComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return AuthProtectedComponent;
};

export default withAuth;
