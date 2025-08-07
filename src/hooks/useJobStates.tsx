import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface JobState {
  id: string;
  job_id: string;
  application_id: string;
  state: string;
  changed_by: string;
  message?: string;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

export const useJobStates = (jobId?: string, applicationId?: string) => {
  const { profile } = useAuth();
  const [states, setStates] = useState<JobState[]>([]);
  const [currentState, setCurrentState] = useState<string>('aplicado');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (jobId && applicationId) {
      fetchJobStates();
    }
  }, [jobId, applicationId]);

  const fetchJobStates = async () => {
    if (!jobId || !applicationId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('job_states')
      .select(`
        *,
        profiles:changed_by (first_name, last_name)
      `)
      .eq('job_id', jobId)
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setStates(data);
      if (data.length > 0) {
        setCurrentState(data[data.length - 1].state);
      }
    }
    setLoading(false);
  };

  const changeState = async (newState: string, autoMessage: string) => {
    if (!profile || !jobId || !applicationId) return false;

    try {
      const { error } = await supabase.rpc('change_job_state', {
        p_job_id: jobId,
        p_application_id: applicationId,
        p_new_state: newState,
        p_changed_by: profile.id,
        p_auto_message: autoMessage
      });

      if (!error) {
        await fetchJobStates();
        return true;
      }
    } catch (error) {
      console.error('Error changing state:', error);
    }
    return false;
  };

  return {
    states,
    currentState,
    loading,
    changeState,
    refetch: fetchJobStates
  };
};