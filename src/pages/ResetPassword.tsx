import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar se há um token de recuperação válido na URL
    const checkResetToken = async () => {
      const url = new URL(window.location.href);
      const accessToken = url.searchParams.get('access_token') || url.hash.match(/access_token=([^&]+)/)?.[1];
      const refreshToken = url.searchParams.get('refresh_token') || url.hash.match(/refresh_token=([^&]+)/)?.[1];
      const error = url.searchParams.get('error') || url.hash.match(/error=([^&]+)/)?.[1];
      const errorDescription = url.searchParams.get('error_description') || url.hash.match(/error_description=([^&]+)/)?.[1];

      // Verificar se há erro na URL (token expirado/inválido)
      if (error) {
        setIsValidToken(false);
        let errorMessage = 'Link de recuperação inválido.';
        
        if (error === 'access_denied' || errorDescription?.includes('expired')) {
          errorMessage = 'Link de recuperação expirado. Solicite um novo link.';
        } else if (errorDescription?.includes('invalid')) {
          errorMessage = 'Link de recuperação inválido. Solicite um novo link.';
        }
        
        toast.error(errorMessage);
        return;
      }

      // Se há tokens, tentar estabelecer a sessão
      if (accessToken && refreshToken) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            setIsValidToken(false);
            toast.error('Token de recuperação inválido. Solicite um novo link.');
          } else if (data.session) {
            setIsValidToken(true);
            // Limpar URL dos parâmetros
            const cleanUrl = `${window.location.origin}${window.location.pathname}`;
            window.history.replaceState({}, '', cleanUrl);
          }
        } catch (err) {
          setIsValidToken(false);
          toast.error('Erro ao processar link de recuperação.');
        }
      } else {
        setIsValidToken(false);
        toast.error('Link de recuperação não encontrado.');
      }
    };

    checkResetToken();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      toast.success('Senha redefinida com sucesso!');
      
      // Aguardar um pouco e redirecionar para login
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
      
    } catch (error: any) {
      console.error('Erro ao redefinir senha:', error);
      toast.error('Erro ao redefinir senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNewLink = () => {
    navigate('/auth');
  };

  const PasswordInput = ({ 
    id, 
    label, 
    value, 
    onChange, 
    showPassword, 
    onToggleShow 
  }: {
    id: string;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    showPassword: boolean;
    onToggleShow: () => void;
  }) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          className="pr-10"
          required
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
          onClick={onToggleShow}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
    </div>
  );

  // Loading state
  if (isValidToken === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Verificando link de recuperação...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid token state
  if (isValidToken === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Link Inválido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              O link de recuperação de senha é inválido ou expirou. 
              Solicite um novo link para redefinir sua senha.
            </p>
            <Button 
              onClick={handleRequestNewLink}
              className="w-full"
              variant="outline"
            >
              Solicitar novo link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid token - show reset form
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Redefinir Senha
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Digite sua nova senha abaixo
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordInput
              id="new-password"
              label="Nova senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              showPassword={showPassword}
              onToggleShow={() => setShowPassword(!showPassword)}
            />

            <PasswordInput
              id="confirm-password"
              label="Confirmar nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              showPassword={showConfirmPassword}
              onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
            />

            <div className="pt-4">
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Redefinindo...' : 'Redefinir Senha'}
              </Button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Requisitos da senha:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Pelo menos 6 caracteres</li>
              <li>• Recomendado: misturar letras, números e símbolos</li>
              <li>• Evite senhas óbvias ou informações pessoais</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;