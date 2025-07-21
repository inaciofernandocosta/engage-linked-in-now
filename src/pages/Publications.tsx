import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Check, X, MoreVertical, Image, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Post {
  id: string;
  content: string;
  image_url?: string;
  status: string;
  scheduled_for?: string;
  created_at: string;
  published_at?: string;
  image_storage_path?: string;
  updated_at: string;
  user_id: string;
  webhook_url?: string;
}

const Publications = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Erro ao buscar posts:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as publicações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const approvePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ status: 'approved' })
        .eq('id', postId);

      if (error) throw error;

      toast({
        title: "Post Aprovado!",
        description: "O post foi aprovado e será publicado imediatamente",
      });

      fetchPosts();
    } catch (error) {
      console.error('Erro ao aprovar post:', error);
      toast({
        title: "Erro",
        description: "Não foi possível aprovar o post",
        variant: "destructive",
      });
    }
  };

  const schedulePost = async (postId: string) => {
    if (!scheduleDate || !scheduleTime) {
      toast({
        title: "Erro",
        description: "Selecione uma data e hora para agendamento",
        variant: "destructive",
      });
      return;
    }

    const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`);
    
    if (scheduledFor <= new Date()) {
      toast({
        title: "Erro",
        description: "A data de agendamento deve ser no futuro",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('posts')
        .update({ scheduled_for: scheduledFor.toISOString() })
        .eq('id', postId);

      if (error) throw error;

      toast({
        title: "Post Agendado!",
        description: `Post agendado para ${scheduledFor.toLocaleString('pt-BR')}`,
      });

      setIsScheduleDialogOpen(false);
      setScheduleDate('');
      setScheduleTime('');
      setSelectedPost(null);
      fetchPosts();
    } catch (error) {
      console.error('Erro ao agendar post:', error);
      toast({
        title: "Erro",
        description: "Não foi possível agendar o post",
        variant: "destructive",
      });
    }
  };

  const deletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast({
        title: "Post Excluído",
        description: "O post foi excluído com sucesso",
      });

      fetchPosts();
    } catch (error) {
      console.error('Erro ao excluir post:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o post",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string, scheduledFor?: string) => {
    switch (status) {
      case 'pending':
        if (scheduledFor) {
          return <Badge variant="outline" className="text-orange-600 border-orange-600">Agendado</Badge>;
        }
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pendente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Aprovado</Badge>;
      case 'published':
        return <Badge variant="outline" className="text-green-600 border-green-600">Publicado</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  const pendingPosts = posts.filter(post => post.status === 'pending');
  const scheduledPosts = posts.filter(post => post.status === 'pending' && post.scheduled_for);
  const publishedPosts = posts.filter(post => post.status === 'published');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando publicações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Publicações</h1>
        <p className="text-muted-foreground">Gerencie suas publicações pendentes, agendadas e publicadas</p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pendentes ({pendingPosts.length})
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Agendados ({scheduledPosts.length})
          </TabsTrigger>
          <TabsTrigger value="published" className="flex items-center gap-2">
            <Check className="w-4 h-4" />
            Publicados ({publishedPosts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingPosts.filter(post => !post.scheduled_for).length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma publicação pendente</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            pendingPosts.filter(post => !post.scheduled_for).map((post) => (
              <Card key={post.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(post.status, post.scheduled_for)}
                      <span className="text-sm text-muted-foreground">
                        {formatDate(post.created_at)}
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => approvePost(post.id)}
                          className="text-green-600"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Aprovar Agora
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedPost(post);
                            setIsScheduleDialogOpen(true);
                          }}
                          className="text-blue-600"
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Agendar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deletePost(post.id)}
                          className="text-red-600"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm">{truncateContent(post.content)}</p>
                    {post.image_url && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Image className="w-4 h-4" />
                        Contém imagem
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          {scheduledPosts.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma publicação agendada</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            scheduledPosts.map((post) => (
              <Card key={post.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(post.status, post.scheduled_for)}
                      <span className="text-sm text-muted-foreground">
                        Agendado para: {post.scheduled_for ? formatDate(post.scheduled_for) : 'N/A'}
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => approvePost(post.id)}
                          className="text-green-600"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Publicar Agora
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => deletePost(post.id)}
                          className="text-red-600"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm">{truncateContent(post.content)}</p>
                    {post.image_url && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Image className="w-4 h-4" />
                        Contém imagem
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="published" className="space-y-4">
          {publishedPosts.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Check className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma publicação realizada</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            publishedPosts.map((post) => (
              <Card key={post.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(post.status)}
                      <span className="text-sm text-muted-foreground">
                        Publicado em: {post.published_at ? formatDate(post.published_at) : formatDate(post.created_at)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm">{truncateContent(post.content)}</p>
                    {post.image_url && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Image className="w-4 h-4" />
                        Contém imagem
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog para agendamento */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar Publicação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="schedule-date">Data</Label>
              <Input
                id="schedule-date"
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label htmlFor="schedule-time">Hora</Label>
              <Input
                id="schedule-time"
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsScheduleDialogOpen(false);
                  setScheduleDate('');
                  setScheduleTime('');
                  setSelectedPost(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => selectedPost && schedulePost(selectedPost.id)}
              >
                Agendar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Publications;