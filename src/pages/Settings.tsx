import { useState, useEffect } from 'react';
import { useTheme } from "next-themes";
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Bell, Moon, Shield, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const Settings = () => {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState({
    notifications: true,
    emailNotifications: false,
    autoSave: true,
    twoFactor: false
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSettingChange = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    
    toast({
      title: "Configuração atualizada",
      description: "Suas preferências foram salvas."
    });
  };

  const handleDarkModeToggle = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
    toast({
      title: "Tema alterado",
      description: `Modo ${theme === 'dark' ? 'claro' : 'escuro'} ativado.`
    });
  };

  const handleDeleteAccount = () => {
    toast({
      title: "Ação não disponível",
      description: "A exclusão de conta estará disponível em breve.",
      variant: "destructive"
    });
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Configurações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Notifications Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">Notificações</h3>
              </div>
              
              <div className="space-y-4 ml-7">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notifications" className="flex flex-col gap-1">
                    <span>Notificações push</span>
                    <span className="text-sm text-muted-foreground">
                      Receber notificações no navegador
                    </span>
                  </Label>
                  <Switch
                    id="notifications"
                    checked={settings.notifications}
                    onCheckedChange={() => handleSettingChange('notifications')}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-notifications" className="flex flex-col gap-1">
                    <span>Notificações por email</span>
                    <span className="text-sm text-muted-foreground">
                      Receber atualizações por email
                    </span>
                  </Label>
                  <Switch
                    id="email-notifications"
                    checked={settings.emailNotifications}
                    onCheckedChange={() => handleSettingChange('emailNotifications')}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Appearance Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Moon className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">Aparência</h3>
              </div>
              
              <div className="ml-7">
                <div className="flex items-center justify-between">
                  <Label htmlFor="dark-mode" className="flex flex-col gap-1">
                    <span>Modo escuro</span>
                    <span className="text-sm text-muted-foreground">
                      Alternar entre tema claro e escuro
                    </span>
                  </Label>
                  <Switch
                    id="dark-mode"
                    checked={theme === 'dark'}
                    onCheckedChange={handleDarkModeToggle}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Security Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">Segurança</h3>
              </div>
              
              <div className="space-y-4 ml-7">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-save" className="flex flex-col gap-1">
                    <span>Salvamento automático</span>
                    <span className="text-sm text-muted-foreground">
                      Salvar automaticamente suas alterações
                    </span>
                  </Label>
                  <Switch
                    id="auto-save"
                    checked={settings.autoSave}
                    onCheckedChange={() => handleSettingChange('autoSave')}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="two-factor" className="flex flex-col gap-1">
                    <span>Autenticação de dois fatores</span>
                    <span className="text-sm text-muted-foreground">
                      Adicionar uma camada extra de segurança
                    </span>
                  </Label>
                  <Switch
                    id="two-factor"
                    checked={settings.twoFactor}
                    onCheckedChange={() => handleSettingChange('twoFactor')}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Danger Zone */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                <h3 className="text-lg font-medium text-destructive">Zona de perigo</h3>
              </div>
              
              <div className="ml-7">
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteAccount}
                  className="w-full"
                >
                  Excluir conta
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Esta ação não pode ser desfeita. Todos os seus dados serão permanentemente removidos.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;