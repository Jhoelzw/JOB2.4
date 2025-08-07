import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CheckCircle, X, MessageCircle, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Application {
  id: string;
  message: string;
  status: string;
  created_at: string;
  job_id: string;
  profiles: {
    id: string;
    first_name: string;
    last_name: string;
    phone?: string;
    experience?: string;
    hourly_rate?: number;
  };
  jobs: {
    title: string;
    payment_amount: number;
    payment_type: string;
  };
}

const EmployerApplications = () => {
  const { profile } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.user_type === 'empleador') {
      fetchApplications();
    }
  }, [profile]);

  const fetchApplications = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        profiles:worker_id (id, first_name, last_name, phone, experience, hourly_rate),
        jobs:job_id (title, payment_amount, payment_type)
      `)
      .eq('jobs.employer_id', profile.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setApplications(data as Application[]);
    }
    setLoading(false);
  };

  const handleAcceptApplication = async (application: Application) => {
    try {
      // Actualizar estado de la aplicación
      const { error: updateError } = await supabase
        .from('applications')
        .update({ status: 'aceptada' })
        .eq('id', application.id);

      if (updateError) throw updateError;

      // Crear chat entre empleador y trabajador
      const { error: chatError } = await supabase
        .from('chats')
        .insert({
          job_id: application.job_id,
          worker_id: application.profiles.id,
          employer_id: profile!.id
        });

      if (chatError && !chatError.message.includes('duplicate')) {
        throw chatError;
      }

      // Crear estado inicial del trabajo
      const { error: stateError } = await supabase.rpc('change_job_state', {
        p_job_id: application.job_id,
        p_application_id: application.id,
        p_new_state: 'aceptado',
        p_changed_by: profile!.id,
        p_auto_message: 'Aplicación aceptada. ¡El chat está ahora habilitado!'
      });

      if (stateError) throw stateError;

      // Crear notificación para el trabajador
      await supabase.rpc('create_notification', {
        p_user_id: application.profiles.id,
        p_type: 'application',
        p_title: '¡Aplicación aceptada!',
        p_message: `Tu aplicación para "${application.jobs.title}" ha sido aceptada`,
        p_job_id: application.job_id,
        p_application_id: application.id
      });

      toast({
        title: "Aplicación aceptada",
        description: "El trabajador ha sido notificado y el chat está habilitado"
      });

      fetchApplications();
    } catch (error) {
      console.error('Error accepting application:', error);
      toast({
        title: "Error",
        description: "No se pudo aceptar la aplicación",
        variant: "destructive"
      });
    }
  };

  const handleRejectApplication = async (applicationId: string) => {
    const { error } = await supabase
      .from('applications')
      .update({ status: 'rechazada' })
      .eq('id', applicationId);

    if (!error) {
      toast({
        title: "Aplicación rechazada",
        description: "El trabajador ha sido notificado"
      });
      fetchApplications();
    }
  };

  if (loading) {
    return <div className="p-4">Cargando aplicaciones...</div>;
  }

  const pendingApplications = applications.filter(app => app.status === 'pendiente');
  const acceptedApplications = applications.filter(app => app.status === 'aceptada');

  return (
    <div className="space-y-6">
      {/* Pending Applications */}
      {pendingApplications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Aplicaciones Pendientes ({pendingApplications.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingApplications.map((application) => (
              <div key={application.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {application.profiles.first_name[0]}{application.profiles.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium">
                        {application.profiles.first_name} {application.profiles.last_name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {application.jobs.title}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {new Date(application.created_at).toLocaleDateString('es-CL')}
                  </Badge>
                </div>

                {application.message && (
                  <p className="text-sm mb-3 p-3 bg-muted rounded">
                    "{application.message}"
                  </p>
                )}

                {application.profiles.experience && (
                  <div className="mb-3">
                    <h5 className="text-sm font-medium mb-1">Experiencia:</h5>
                    <p className="text-sm text-muted-foreground">
                      {application.profiles.experience}
                    </p>
                  </div>
                )}

                {application.profiles.hourly_rate && (
                  <p className="text-sm mb-3">
                    <strong>Tarifa:</strong> ${application.profiles.hourly_rate.toLocaleString()} CLP/hora
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleAcceptApplication(application)}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aceptar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleRejectApplication(application.id)}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Rechazar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Accepted Applications */}
      {acceptedApplications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Trabajadores Aceptados ({acceptedApplications.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {acceptedApplications.map((application) => (
              <div key={application.id} className="border rounded-lg p-4 bg-green-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {application.profiles.first_name[0]}{application.profiles.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium">
                        {application.profiles.first_name} {application.profiles.last_name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {application.jobs.title}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-500">
                      Aceptado
                    </Badge>
                    <Button variant="outline" size="sm">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Chat
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {applications.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No hay aplicaciones</h3>
            <p className="text-muted-foreground">
              Cuando los trabajadores apliquen a tus trabajos, aparecerán aquí.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmployerApplications;