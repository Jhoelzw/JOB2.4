import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Clock, DollarSign, MessageCircle, User } from 'lucide-react';
import { WORK_CATEGORIES, formatCLP } from '@/data/chileanData';
import { toast } from '@/hooks/use-toast';
import ChatWindow from './ChatWindow';
import JobStateManager from './JobStateManager';

interface Job {
  id: string;
  title: string;
  description: string;
  category: string;
  payment_amount: number;
  payment_type: string;
  location: string;
  date_needed: string;
  duration_hours?: number;
  status: string;
  assigned_to?: string;
  profiles: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface JobDetailsProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onApply?: (jobId: string) => void;
  canApply?: boolean;
}

const JobDetails = ({ job, isOpen, onClose, onApply, canApply }: JobDetailsProps) => {
  const { profile } = useAuth();
  const [showChat, setShowChat] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (job && profile && isOpen) {
      checkApplicationStatus();
    }
  }, [job, profile, isOpen]);

  const checkApplicationStatus = async () => {
    if (!job || !profile) return;

    const { data, error } = await supabase
      .from('applications')
      .select('status')
      .eq('job_id', job.id)
      .eq('worker_id', profile.id)
      .single();

    if (!error && data) {
      setHasApplied(true);
      setApplicationStatus(data.status);
    }
  };

  const handleApply = async () => {
    if (!job || !profile) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('applications')
        .insert({
          job_id: job.id,
          worker_id: profile.id,
          message: 'Estoy interesado en este trabajo'
        });

      if (!error) {
        // Crear notificación para el empleador
        await supabase
          .from('notifications')
          .insert({
            user_id: job.profiles.id,
            job_id: job.id,
            type: 'job_application',
            title: 'Nueva aplicación',
            message: `${profile.first_name} ${profile.last_name} aplicó a "${job.title}"`
          });

        toast({
          title: "¡Aplicación enviada!",
          description: "El empleador será notificado de tu interés"
        });

        setHasApplied(true);
        setApplicationStatus('pendiente');
        onApply?.(job.id);
      } else {
        throw error;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message.includes('duplicate') 
          ? "Ya has aplicado a este trabajo" 
          : "No se pudo enviar la aplicación",
        variant: "destructive"
      });
    }

    setLoading(false);
  };

  if (!job) return null;

  const category = WORK_CATEGORIES.find(cat => cat.id === job.category);
  
  const formatPayment = (amount: number, type: string) => {
    const formatted = formatCLP(amount);
    const typeMap = {
      por_hora: 'por hora',
      por_dia: 'por día',
      por_trabajo: 'por trabajo'
    };
    return `${formatted} ${typeMap[type as keyof typeof typeMap] || type}`;
  };

  const getDurationText = (hours?: number) => {
    if (!hours) return 'Varios días';
    if (hours <= 2) return '1-2 horas';
    if (hours <= 4) return 'Medio día';
    if (hours <= 8) return 'Día completo';
    return `${hours} horas`;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'published': 'Publicado',
      'applied': 'Aplicado',
      'accepted': 'Aceptado',
      'in_progress': 'En Proceso',
      'completed': 'Completado'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-blue-500';
      case 'applied': return 'bg-yellow-500';
      case 'accepted': return 'bg-green-500';
      case 'in_progress': return 'bg-orange-500';
      case 'completed': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  // Determinar si mostrar el chat
  const shouldShowChat = () => {
    if (!profile) return false;
    
    // Empleador siempre puede ver el chat si hay aplicaciones aceptadas
    if (profile.user_type === 'empleador' && profile.id === job.profiles.id) {
      return applicationStatus === 'aceptada' || job.status !== 'published';
    }
    
    // Trabajador puede ver el chat si su aplicación fue aceptada
    if (profile.user_type === 'trabajador') {
      return applicationStatus === 'aceptada';
    }
    
    return false;
  };

  // Determinar si mostrar el gestor de estados
  const shouldShowStateManager = () => {
    return shouldShowChat() && (applicationStatus === 'aceptada' || job.status !== 'published');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{job.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header with Category and Payment */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{category?.emoji}</span>
              <span className="font-medium">{category?.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-lg px-3 py-1">
                {formatPayment(job.payment_amount, job.payment_type)}
              </Badge>
              <Badge className={`${getStatusColor(job.status)} text-white`}>
                {getStatusLabel(job.status)}
              </Badge>
            </div>
          </div>

          {/* Tabs for different sections */}
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Detalles</TabsTrigger>
              {shouldShowChat() && <TabsTrigger value="chat">Chat</TabsTrigger>}
              {shouldShowStateManager() && <TabsTrigger value="state">Estado</TabsTrigger>}
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              {/* Job Description */}
              <div>
                <h3 className="font-semibold mb-2">Descripción del Trabajo</h3>
                <p className="text-muted-foreground leading-relaxed">{job.description}</p>
              </div>

              {/* Job Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{job.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{new Date(job.date_needed).toLocaleDateString('es-CL')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{getDurationText(job.duration_hours)}</span>
                </div>
              </div>

              {/* Employer Info */}
              <div>
                <h3 className="font-semibold mb-2">
                  {profile?.user_type === 'empleador' ? 'Mi Trabajo' : 'Empleador'}
                </h3>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      {job.profiles.first_name[0]}{job.profiles.last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span>{job.profiles.first_name} {job.profiles.last_name}</span>
                </div>
              </div>

              {/* Application Status */}
              {hasApplied && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Estado de tu Aplicación</h4>
                  <Badge className={`${getStatusColor(applicationStatus)} text-white`}>
                    {getStatusLabel(applicationStatus)}
                  </Badge>
                  {applicationStatus === 'aceptada' && (
                    <p className="text-sm text-blue-700 mt-2">
                      ¡Felicitaciones! Tu aplicación fue aceptada. Ahora puedes chatear con el empleador.
                    </p>
                  )}
                </div>
              )}

              {/* Reference Pricing */}
              {category && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Tarifas Referenciales {category.emoji}</h4>
                  <div className="text-sm text-blue-700">
                    <p>Por hora: {formatCLP(category.hourlyRange.min)} - {formatCLP(category.hourlyRange.max)}</p>
                    <p>Por día: {formatCLP(category.dailyRange.min)} - {formatCLP(category.dailyRange.max)}</p>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    *Precios referenciales. Tienes total libertad para acordar el precio final.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                {canApply && !hasApplied && (
                  <Button 
                    onClick={handleApply}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? 'Aplicando...' : 'Aplicar a este trabajo'}
                  </Button>
                )}

                {shouldShowChat() && (
                  <Button 
                    variant="outline" 
                    onClick={() => setShowChat(true)}
                    className="px-6"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Abrir Chat
                  </Button>
                )}
              </div>
            </TabsContent>

            {shouldShowChat() && (
              <TabsContent value="chat">
                <ChatWindow 
                  jobId={job.id} 
                  onClose={() => setShowChat(false)} 
                />
              </TabsContent>
            )}

            {shouldShowStateManager() && (
              <TabsContent value="state">
                <JobStateManager
                  jobId={job.id}
                  currentStatus={job.status}
                  userType={profile?.user_type || 'trabajador'}
                  onStateChange={(newState) => {
                    // Actualizar el estado local del trabajo
                    job.status = newState;
                  }}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JobDetails;