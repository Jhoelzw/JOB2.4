import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, Clock, DollarSign, MessageCircle } from 'lucide-react';
import { WORK_CATEGORIES, formatCLP } from '@/data/chileanData';

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
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface JobDetailsModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onApply: (jobId: string) => void;
  onMessage: () => void;
  canApply: boolean;
}

const JobDetailsModal = ({ job, isOpen, onClose, onApply, onMessage, canApply }: JobDetailsModalProps) => {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{job.title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Category and Payment */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{category?.emoji}</span>
              <span className="font-medium">{category?.name}</span>
            </div>
            <Badge variant="default" className="text-lg px-3 py-1">
              {formatPayment(job.payment_amount, job.payment_type)}
            </Badge>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">Descripción del Trabajo</h3>
            <p className="text-muted-foreground leading-relaxed">{job.description}</p>
          </div>

          {/* Details */}
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
            <h3 className="font-semibold mb-2">Empleador</h3>
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {job.profiles.first_name[0]}{job.profiles.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <span>{job.profiles.first_name} {job.profiles.last_name}</span>
            </div>
          </div>

          {/* Action Buttons */}
          {canApply && (
            <div className="flex gap-3 pt-4 border-t">
              <Button 
                onClick={() => onApply(job.id)}
                className="flex-1"
              >
                Aplicar a este trabajo
              </Button>
              <Button 
                variant="outline" 
                onClick={onMessage}
                className="px-6"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Mensaje
              </Button>
            </div>
          )}

          {/* Reference note */}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JobDetailsModal;