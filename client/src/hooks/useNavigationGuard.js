import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const useNavigationGuard = () => {
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const handlePopState = (event) => {
      // If user is not authenticated and trying to go back to authenticated pages
      if (!isAuthenticated && window.location.pathname !== '/') {
        // Prevent going back to authenticated pages
        window.history.pushState(null, '', '/');
      }
    };

    // Add event listener for browser back/forward buttons
    window.addEventListener('popstate', handlePopState);

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isAuthenticated, user]);

  // Clear history when user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      // Clear any previous user's history by replacing current state
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [isAuthenticated, user, user?.id]); // Include all dependencies used in the effect
};

export default useNavigationGuard;
