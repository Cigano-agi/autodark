import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useProductionPersistence(channelId: string | undefined) {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const saveState = useCallback(async (step: number, data: any) => {
    if (!user || !channelId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('production_states' as any)
        .upsert({
          user_id: user.id,
          channel_id: channelId,
          step,
          data,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'channel_id' });

      if (error) {
        if (error.code === '42P01') {
          console.warn('Table production_states not found yet. Using localStorage fallback.');
          localStorage.setItem(`autodark_fallback_state_${channelId}`, JSON.stringify({ step, data }));
        } else {
          throw error;
        }
      }
    } catch (e: any) {
      console.error('Failed to save production state:', e);
    } finally {
      setIsSaving(false);
    }
  }, [user, channelId]);

  const loadState = useCallback(async () => {
    if (!user || !channelId) return null;
    try {
      const { data, error } = await supabase
        .from('production_states' as any)
        .select('*')
        .eq('channel_id', channelId)
        .maybeSingle();

      if (error) {
        if (error.code === '42P01') {
          const local = localStorage.getItem(`autodark_fallback_state_${channelId}`);
          return local ? JSON.parse(local) : null;
        }
        throw error;
      }
      return data;
    } catch (e) {
      console.error('Failed to load production state:', e);
      return null;
    }
  }, [user, channelId]);

  return { saveState, loadState, isSaving };
}
