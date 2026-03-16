import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Fallback page for /auth/callback.
 * With the JS SDK popup flow, this page is no longer the primary auth handler.
 * If someone lands here, redirect them to onboarding.
 */
export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/onboarding', { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-text-secondary">Redirecting...</p>
      </div>
    </div>
  );
}
