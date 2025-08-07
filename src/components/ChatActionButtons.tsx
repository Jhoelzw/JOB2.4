import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Hammer, CheckCheck, Car, Camera, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ChatActionButtonsProps {
  currentState: string;
  userType: 'trabajador' | 'empleador';
  onStateChange: (newState: string, message: string) => void;
  onLocationShare: () => void;
  onPhotoUpload: () => void;
  onTimeEstimate: () => void;
}

const ChatActionButtons = ({ 
  currentState, 
  userType, 
  onStateChange,
  onLocationShare,
  onPhotoUpload,
  onTimeEstimate
}: ChatActionButtonsProps) => {
  const getAvailableActions = () => {
    const actions = [];

    if (userType === 'trabajador') {
      switch (currentState) {
        case 'aceptado':
          actions.push({
            key: 'en_camino',
            icon: Car,
            label: '🚗 Voy en camino',
            message: 'Voy en camino al trabajo',
            variant: 'default' as const,
            className: 'bg-yellow-500 hover:bg-yellow-600'
          });
          break;
        case 'en_camino':
          actions.push({
            key: 'en_proceso',
            icon: MapPin,
            label: '📍 Llegué al lugar',
            message: 'He llegado y empiezo el trabajo',
            variant: 'default' as const,
            className: 'bg-orange-500 hover:bg-orange-600'
          });
          break;
        case 'en_proceso':
          actions.push({
            key: 'completado',
            icon: CheckCheck,
            label: '✅ Trabajo terminado',
            message: 'Trabajo completado, por favor confirma',
            variant: 'default' as const,
            className: 'bg-green-500 hover:bg-green-600'
          });
          break;
      }
    }

    if (userType === 'empleador' && currentState === 'completado') {
      actions.push({
        key: 'confirmado',
        icon: CheckCheck,
        label: '✅ Confirmo completado',
        message: 'Trabajo confirmado como completado',
        variant: 'default' as const,
        className: 'bg-green-700 hover:bg-green-800'
      });
    }

    return actions;
  };

  const getUtilityActions = () => {
    const utilities = [];

    if (['aceptado', 'en_camino', 'en_proceso'].includes(currentState)) {
      utilities.push({
        key: 'location',
        icon: MapPin,
        label: '📍 Compartir ubicación',
        onClick: onLocationShare,
        variant: 'outline' as const
      });

      utilities.push({
        key: 'time',
        icon: Clock,
        label: '⏰ Tiempo llegada',
        onClick: onTimeEstimate,
        variant: 'outline' as const
      });
    }

    if (['en_proceso'].includes(currentState)) {
      utilities.push({
        key: 'photo',
        icon: Camera,
        label: '📸 Subir foto progreso',
        onClick: onPhotoUpload,
        variant: 'outline' as const
      });
    }

    return utilities;
  };

  const stateActions = getAvailableActions();
  const utilityActions = getUtilityActions();

  if (stateActions.length === 0 && utilityActions.length === 0) {
    return null;
  }

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <h4 className="font-medium mb-3 text-sm text-muted-foreground">
          Acciones Rápidas
        </h4>
        
        {/* State Change Actions */}
        {stateActions.length > 0 && (
          <div className="space-y-2 mb-3">
            {stateActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.key}
                  onClick={() => onStateChange(action.key, action.message)}
                  className={`w-full justify-start text-left h-auto py-3 ${action.className}`}
                  variant={action.variant}
                >
                  <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="font-medium">{action.label}</span>
                </Button>
              );
            })}
          </div>
        )}

        {/* Utility Actions */}
        {utilityActions.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {utilityActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.key}
                  onClick={action.onClick}
                  variant={action.variant}
                  size="sm"
                  className="justify-start text-xs"
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {action.label}
                </Button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChatActionButtons;