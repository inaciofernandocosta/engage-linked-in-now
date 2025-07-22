import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useStatistics = () => {
  return useQuery({
    queryKey: ['statistics'],
    queryFn: async () => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Posts de hoje
      const { data: postsToday, error: postsError } = await supabase
        .from('posts')
        .select('id')
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString());

      if (postsError) throw postsError;

      // Total de posts e aprovados
      const { data: totalPosts, error: totalError } = await supabase
        .from('posts')
        .select('id, status');

      if (totalError) throw totalError;

      const approvedPosts = totalPosts?.filter(post => post.status === 'approved' || post.status === 'published') || [];
      const approvalRate = totalPosts?.length > 0 ? Math.round((approvedPosts.length / totalPosts.length) * 100) : 0;

      return {
        postsToday: postsToday?.length || 0,
        approvalRate,
        totalPosts: totalPosts?.length || 0,
        approvedPosts: approvedPosts.length
      };
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });
};