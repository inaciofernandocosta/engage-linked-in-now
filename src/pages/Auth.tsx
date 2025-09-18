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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
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
      if (isSignUp) {
        const redirectUrl = `${window.location.origin}/`;
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              first_name: firstName,
              last_name: lastName,
            }
          }
        });

        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Este email já está cadastrado. Tente fazer login.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Conta criada! Verifique seu email para confirmar.');
        }
      } else {
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
      }
    } catch (error) {
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    
    try {
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
            {isSignUp ? 'Cadastre-se' : 'Entrar'}
          </h1>
          {!isSignUp && (
            <p className="text-sm text-muted-foreground">
              ou{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className="text-blue-600 hover:underline font-medium"
              >
                Cadastre-se no LinkedIn
              </button>
            </p>
          )}
          {isSignUp && (
            <p className="text-sm text-muted-foreground">
              ou{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="text-blue-600 hover:underline font-medium"
              >
                Entrar na sua conta
              </button>
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
          {isSignUp && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="sr-only">
                  Nome
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Nome"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required={isSignUp}
                  className="h-12 border-gray-300 rounded-md"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="sr-only">
                  Sobrenome
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Sobrenome"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required={isSignUp}
                  className="h-12 border-gray-300 rounded-md"
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="email" className="sr-only">
              E-mail ou telefone
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="E-mail ou telefone"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 border-gray-300 rounded-md"
            />
          </div>

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

          {!isSignUp && (
            <div className="text-left">
              <button
                type="button"
                className="text-blue-600 hover:underline text-sm font-medium"
              >
                Esqueceu a senha?
              </button>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full"
          >
            {loading ? 'Carregando...' : isSignUp ? 'Cadastrar' : 'Entrar'}
          </Button>
        </form>

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
          disabled={loading}
          className="w-full h-12 border-gray-600 text-gray-700 hover:bg-gray-50 font-medium rounded-full flex items-center justify-center space-x-2"
        >
          <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-blue-600">G</span>
          </div>
          <span>Entrar com o Google</span>
        </Button>

        {/* Footer text */}
        {isSignUp && (
          <p className="text-xs text-center text-muted-foreground mt-4">
            Ao clicar em Aceitar e entrar ou Continuar, você concorda com os{' '}
            <a href="#" className="text-blue-600 hover:underline">
              Termos de Uso
            </a>{' '}
            e{' '}
            <a href="#" className="text-blue-600 hover:underline">
              Política de Privacidade
            </a>{' '}
            do LinkedIn.
          </p>
        )}
      </div>
    </div>
  );
};

export default Auth;