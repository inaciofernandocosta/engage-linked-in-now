import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Profile {
  first_name: string;
  last_name: string;
  job_title: string;
  avatar_url: string;
}

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, job_title, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const getFullName = () => {
    if (!profile?.first_name && !profile?.last_name) {
      return user?.email?.split('@')[0] || 'Usuário';
    }
    return `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
  };

  const getUserInitials = () => {
    const fullName = getFullName();
    return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarUrl = () => {
    if (profile?.avatar_url) {
      // If it's a Supabase storage URL, construct the full URL
      if (profile.avatar_url.startsWith('avatars/')) {
        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(profile.avatar_url);
        return data.publicUrl;
      }
      return profile.avatar_url;
    }
    return null;
  };

  return {
    profile,
    loading,
    getFullName,
    getUserInitials,
    getAvatarUrl,
    refreshProfile: fetchProfile,
  };
};