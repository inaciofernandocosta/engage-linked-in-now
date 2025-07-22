import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface Post {
  id: string;
  content: string;
  image_url?: string;
  images?: Array<{ url: string; name: string; storage_path?: string }>;
  status: string;
  scheduled_for?: string;
  created_at: string;
  published_at?: string;
  image_storage_path?: string;
  updated_at: string;
  user_id: string;
  webhook_url?: string;
}

export const usePosts = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchPosts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Process the posts data to handle JSONB images column
      const processedPosts = (data || []).map(post => ({
        ...post,
        images: Array.isArray(post.images) 
          ? (post.images as Array<{ url: string; name: string; storage_path?: string }>)
          : []
      }));
      
      setPosts(processedPosts);
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

  const schedulePost = async (postId: string, scheduledFor: Date) => {
    if (scheduledFor <= new Date()) {
      toast({
        title: "Erro",
        description: "A data de agendamento deve ser no futuro",
        variant: "destructive",
      });
      return false;
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

      fetchPosts();
      return true;
    } catch (error) {
      console.error('Erro ao agendar post:', error);
      toast({
        title: "Erro",
        description: "Não foi possível agendar o post",
        variant: "destructive",
      });
      return false;
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

  const deleteAllPosts = async () => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Todos os Posts Excluídos",
        description: "Todos os posts foram excluídos com sucesso",
      });

      fetchPosts();
    } catch (error) {
      console.error('Erro ao excluir todos os posts:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir todos os posts",
        variant: "destructive",
      });
    }
  };

  const deletePostsByStatus = async (status: string, scheduledOnly?: boolean) => {
    try {
      let query = supabase
        .from('posts')
        .delete()
        .eq('user_id', user?.id)
        .eq('status', status);

      if (scheduledOnly) {
        query = query.not('scheduled_for', 'is', null);
      } else if (status === 'pending') {
        query = query.is('scheduled_for', null);
      }

      const { error } = await query;

      if (error) throw error;

      const statusNames = {
        'pending': scheduledOnly ? 'agendados' : 'pendentes',
        'published': 'publicados'
      };

      toast({
        title: "Posts Excluídos",
        description: `Todos os posts ${statusNames[status as keyof typeof statusNames]} foram excluídos com sucesso`,
      });

      fetchPosts();
    } catch (error) {
      console.error(`Erro ao excluir posts ${status}:`, error);
      toast({
        title: "Erro",
        description: `Não foi possível excluir os posts ${status}`,
        variant: "destructive",
      });
    }
  };

  const duplicatePost = async (post: Post) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: post.content,
          image_url: post.image_url,
          image_storage_path: post.image_storage_path,
          images: post.images || [],
          webhook_url: post.webhook_url,
          status: 'pending',
          scheduled_for: null
        });

      if (error) throw error;

      toast({
        title: "Post Duplicado",
        description: "O post foi duplicado e adicionado aos pendentes",
      });

      fetchPosts();
    } catch (error) {
      console.error('Erro ao duplicar post:', error);
      toast({
        title: "Erro", 
        description: "Não foi possível duplicar o post",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [user]);

  // Configurar real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Recarregar posts quando houver mudanças
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    posts,
    loading,
    fetchPosts,
    approvePost,
    schedulePost,
    deletePost,
    deleteAllPosts,
    deletePostsByStatus,
    duplicatePost
  };
};