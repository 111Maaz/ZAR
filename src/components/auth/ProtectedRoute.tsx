import { type ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { LoadingState } from '@/components/ui/States';

export function ProtectedRoute({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();
  const [verified, setVerified] = useState(false);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      if (!session) {
        if (!cancelled) {
          setVerified(true);
          setIsValid(false);
        }
        return;
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!cancelled) {
          setVerified(true);
          setIsValid(!!user && user.id === session.user.id);
        }
      } catch {
        if (!cancelled) {
          setVerified(true);
          setIsValid(false);
        }
      }
    }

    verifySession();

    return () => {
      cancelled = true;
    };
  }, [session]);

  if (loading || !verified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingState message="Loading..." />
      </div>
    );
  }

  if (!session || !isValid || profile?.access_status === 'disabled') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
