import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, MapPin, Hammer, CheckCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface JobStateManagerProps {
  jobId: string;
  currentStatus: string;
  userType: 'trabajador' | 'empleador';
  onStateChange?: (newState: string) => void;
}

const JobStateManager = ({ jobId, currentStatus, userType, onStateChange }: JobStateManagerProps) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [jobState, setJobState] = useState<any>(null);

  useEffect(() => {
    fetchJobState();
  }, [jobId]);

  const fetchJobState = async () => {
    const { data, error } = await supabase
      .from('job_states')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (!error && data) {
      setJobState(data);
    }
  };

  const updateJobState = async (newStatus: string, stateField?: string) => {
    if (!profile) return;

    setLoading(true);

    try {
      // Actualizar el estado del trabajo
      const { error: jobError } = await supabase
        .from('jobs')
        .update({ status: newStatus })
        .eq('id', jobId);

      if (jobError) throw jobError;

      // Actualizar o crear job_state
      const updateData: any = {};
      if (stateField) {
        updateData[stateField] = new Date().toISOString();
      }

      const { error: stateError } = await supabase
        .from('job_states')
        .upsert({
          job_id: jobId,
          ...updateData
        });

      if (stateError) throw stateError;

      // Enviar mensaje del sistema al chat
      const systemMessage = getSystemMessage(newStatus, userType);
      await supabase
        .from('messages')
        .insert({
          job_id: jobId,
          sender_id: profile.id,
          message: systemMessage,
          message_type: 'system'
        });

      // Crear notificación
      await createStateNotification(newStatus);

      toast({
        title: "Estado actualizado",
        description: `El trabajo ahora está: ${getStatusLabel(newStatus)}`
      });

      onStateChange?.(newStatus);
      fetchJobState();

    } catch (error) {
      console.error('Error updating job state:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive"
      });
    }

    setLoading(false);
  };

  const createStateNotification = async (newStatus: string) => {
    if (!profile) return;

    // Obtener información del trabajo para notificar al otro usuario
    const { data: job } = await supabase
      .from('jobs')
      .select('title, employer_id, assigned_to')
      .eq('id', jobId)
      .single();

    if (!job) return;

    const isEmployer = profile.user_type === 'empleador';
    const recipientId = isEmployer ? job.assigned_to : job.employer_id;

    if (recipientId) {
      await supabase
        .from('notifications')
        .insert({
          user_id: recipientId,
          job_id: jobId,
          type: 'job_state',
          title: 'Estado de trabajo actualizado',
          message: `El trabajo "${job.title}" cambió a: ${getStatusLabel(newStatus)}`
        });
    }
  };

  const getSystemMessage = (status: string, userType: string): string => {
    const userName = `${profile?.first_name} ${profile?.last_name}`;
    
    switch (status) {
      case 'in_progress':
        return userType === 'trabajador' 
          ? `${userName} ha llegado y comenzó el trabajo`
          : `${userName} confirmó el inicio del trabajo`;
      case 'completed':
        return userType === 'trabajador'
          ? `${userName} marcó el trabajo como completado`
          : `${userName} confirmó que el trabajo está completado`;
      default:
        return `Estado actualizado a: ${getStatusLabel(status)}`;
    }
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      'published': 'Publicado',
      'applied': 'Aplicado',
      'accepted': 'Aceptado',
      'in_progress': 'En Proceso',
      'completed': 'Completado',
      'cancelled': 'Cancelado'
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return Clock;
      case 'applied':
        return CheckCircle;
      case 'accepted':
        return CheckCircle;
      case 'in_progress':
        return Hammer;
      case 'completed':
        return CheckCheck;
      default:
        return Clock;
    }
  };

  const getAvailableActions = () => {
    const actions = [];

    if (userType === 'trabajador') {
      if (currentStatus === 'accepted') {
        actions.push({
          label: '📍 Ya Llegué - Empezar Trabajo',
          action: () => updateJobState('in_progress', 'worker_started_at'),
          variant: 'default' as const,
          className: 'bg-green-500 hover:bg-green-600'
        });
      } else if (currentStatus === 'in_progress') {
        actions.push({
          label: '✅ Trabajo Terminado',
          action: () => updateJobState('completed', 'work_completed_at'),
          variant: 'default' as const,
          className: 'bg-blue-500 hover:bg-blue-600'
        });
      }
    }

    if (userType === 'empleador') {
      if (currentStatus === 'completed') {
        actions.push({
          label: '✅ Confirmar Completado',
          action: () => updateJobState('completed', 'employer_approved_at'),
          variant: 'default' as const,
          className: 'bg-green-500 hover:bg-green-600'
        });
      }
    }

    return actions;
  };

  const StatusIcon = getStatusIcon(currentStatus);
  const actions = getAvailableActions();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <StatusIcon className="h-5 w-5" />
          Estado del Trabajo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center">
          <Badge variant="default" className="text-sm px-4 py-2">
            {getStatusLabel(currentStatus)}
          </Badge>
        </div>

        {/* Timeline Visual */}
        <div className="space-y-3">
          {[
            { key: 'published', label: 'Publicado', field: null },
            { key: 'accepted', label: 'Aceptado', field: 'worker_assigned_at' },
            { key: 'in_progress', label: 'En Proceso', field: 'worker_started_at' },
            { key: 'completed', label: 'Completado', field: 'work_completed_at' }
          ].map((step, index) => {
            const isCompleted = ['published', 'accepted', 'in_progress', 'completed'].indexOf(currentStatus) >= index;
            const isCurrent = step.key === currentStatus;
            
            return (
              <div key={step.key} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-300'
                } ${isCurrent ? 'ring-2 ring-blue-500' : ''}`} />
                <span className={`text-sm ${
                  isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}>
                  {step.label}
                </span>
                {jobState && step.field && jobState[step.field] && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(jobState[step.field]).toLocaleString('es-CL')}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        {actions.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            {actions.map((action, index) => (
              <Button
                key={index}
                onClick={action.action}
                disabled={loading}
                className={`w-full ${action.className}`}
                variant={action.variant}
              >
                {loading ? 'Actualizando...' : action.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default JobStateManager;