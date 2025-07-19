import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LinkedInPostAdmin from '@/components/LinkedInPostAdmin';
import Header from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [isAuthenticated, loading, navigate]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Only render the main app if authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Header />
      <LinkedInPostAdmin />
    </>
  );
};

export default Index;
