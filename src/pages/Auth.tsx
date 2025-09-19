import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { toast } from 'sonner';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Clear any problematic URL parameters that might cause token errors
    const url = new URL(window.location.href);
    const hasAuthParams = url.searchParams.has('access_token') || 
                         url.searchParams.has('refresh_token') || 
                         url.searchParams.has('token_hash') ||
                         url.hash.includes('access_token');
    
    if (hasAuthParams) {
      // Clean URL by removing hash and search params
      const cleanUrl = `${window.location.origin}${window.location.pathname}`;
      window.history.replaceState({}, '', cleanUrl);
    }

    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Auth error:', error);
          // Clear any stored session data if there's an error
          await supabase.auth.signOut();
        } else if (session) {
          navigate('/');
        }
      } catch (err) {
        console.error('Session check error:', err);
      }
    };
    checkAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          navigate('/');
        } else if (event === 'TOKEN_REFRESHED') {
          // Handle token refresh
          console.log('Token refreshed successfully');
        } else if (event === 'SIGNED_OUT') {
          // Clear any problematic state
          console.log('User signed out');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Primeiro verificar se o email existe na tabela profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (profileError) {
        toast.error('Erro ao verificar acesso. Tente novamente.');
        return;
      }

      if (!profile) {
        toast.error('Sistema restrito. Acesso não autorizado para este email.');
        return;
      }

      // Se o email existe na tabela profiles, proceder com o login
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email ou senha incorretos.');
        } else if (error.message.includes('Invalid token') || error.message.includes('signature is invalid')) {
          toast.error('Erro de autenticação. Tente novamente.');
          // Clear any problematic session data
          await supabase.auth.signOut();
        } else {
          toast.error(error.message);
        }
      }
    } catch (error) {
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!email) {
      toast.error('Por favor, insira seu email primeiro para verificar o acesso.');
      return;
    }

    setLoading(true);
    
    try {
      // Verificar se o email existe na tabela profiles antes do login Google
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (profileError) {
        toast.error('Erro ao verificar acesso. Tente novamente.');
        return;
      }

      if (!profile) {
        toast.error('Sistema restrito. Acesso não autorizado para este email.');
        return;
      }

      // Se o email existe na tabela profiles, proceder com o login Google
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error('Erro no login Google:', error);
        toast.error('Erro ao fazer login com Google. Tente novamente.');
      }
      
    } catch (err) {
      console.error('Erro ao iniciar login Google:', err);
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Por favor, insira seu email.');
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast.error('Erro ao enviar email de recuperação. Tente novamente.');
      } else {
        toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.');
        setIsForgotPassword(false);
      }
    } catch (err) {
      console.error('Erro ao recuperar senha:', err);
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header with LinkedIn logo and close button */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">in</span>
            </div>
            <span className="text-2xl font-bold text-blue-600">LinkedIn</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="h-8 w-8"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-normal text-foreground mb-2">
            {isForgotPassword ? 'Recuperar senha' : 'Entrar'}
          </h1>
          {isForgotPassword && (
            <p className="text-sm text-muted-foreground">
              Insira seu email para receber o link de recuperação de senha
            </p>
          )}
          {!isForgotPassword && (
            <p className="text-sm text-muted-foreground">
              Sistema restrito - Acesso apenas para usuários autorizados
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={isForgotPassword ? handleForgotPassword : handleEmailLogin} className="space-y-4 mb-6">
          <div>
            <Label htmlFor="email" className="sr-only">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 border-gray-300 rounded-md"
            />
          </div>

          {!isForgotPassword && (
            <div>
              <Label htmlFor="password" className="sr-only">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 border-gray-300 rounded-md"
              />
            </div>
          )}

          {!isForgotPassword && (
            <div className="text-left">
              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-blue-600 hover:underline text-sm font-medium"
              >
                Esqueceu a senha?
              </button>
            </div>
          )}

          {isForgotPassword && (
            <div className="text-left">
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="text-blue-600 hover:underline text-sm font-medium"
              >
                Voltar ao login
              </button>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full"
          >
            {loading ? 'Carregando...' : 
             isForgotPassword ? 'Enviar email de recuperação' : 'Entrar'}
          </Button>
        </form>

        {!isForgotPassword && (
          <>
            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-background text-muted-foreground">ou</span>
              </div>
            </div>

            {/* Google Login */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={loading || !email}
              className="w-full h-12 border-gray-600 text-gray-700 hover:bg-gray-50 font-medium rounded-full flex items-center justify-center space-x-2"
            >
              <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-blue-600">G</span>
              </div>
              <span>Entrar com o Google</span>
            </Button>
            {!email && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Insira seu email primeiro para verificar o acesso
              </p>
            )}
          </>
        )}

      </div>
    </div>
  );
};

export default Auth;