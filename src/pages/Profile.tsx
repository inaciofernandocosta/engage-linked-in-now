import { useState, useEffect } from 'react';
import { Camera, Save } from 'lucide-react';
import Header from '@/components/Header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  first_name: string;
  last_name: string;
  job_title: string;
  avatar_url: string;
}

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    first_name: '',
    last_name: '',
    job_title: '',
    avatar_url: ''
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          job_title: data.job_title || '',
          avatar_url: data.avatar_url || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar perfil",
        variant: "destructive"
      });
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setProfile(prev => ({ ...prev, avatar_url: data.publicUrl }));

      toast({
        title: "Sucesso",
        description: "Avatar atualizado com sucesso!"
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Erro",
        description: "Erro ao fazer upload do avatar",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user?.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          job_title: profile.job_title,
          avatar_url: profile.avatar_url,
          email: user?.email
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!"
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar perfil",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getUserInitials = () => {
    const firstName = profile.first_name || user?.user_metadata?.first_name || '';
    const lastName = profile.last_name || user?.user_metadata?.last_name || '';
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Meu Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback className="text-lg">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors">
                  <Camera className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
              {uploading && (
                <p className="text-sm text-muted-foreground">Fazendo upload...</p>
              )}
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Nome</Label>
                <Input
                  id="first_name"
                  value={profile.first_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="Seu nome"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="last_name">Sobrenome</Label>
                <Input
                  id="last_name"
                  value={profile.last_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Seu sobrenome"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="job_title">Cargo</Label>
              <Input
                id="job_title"
                value={profile.job_title}
                onChange={(e) => setProfile(prev => ({ ...prev, job_title: e.target.value }))}
                placeholder="Seu cargo atual"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>

            <Button 
              onClick={handleSave} 
              disabled={loading}
              className="w-full"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar Perfil'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;