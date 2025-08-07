import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, MapPin, Hammer, CheckCheck, User } from 'lucide-react';

interface JobState {
  id: string;
  state: string;
  created_at: string;
  message?: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface JobStateTimelineProps {
  states: JobState[];
  currentState: string;
}

const JobStateTimeline = ({ states, currentState }: JobStateTimelineProps) => {
  const stateConfig = {
    aplicado: { 
      icon: User, 
      label: 'Aplicado', 
      color: 'bg-gray-500',
      textColor: 'text-gray-600'
    },
    aceptado: { 
      icon: CheckCircle, 
      label: 'Aceptado', 
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    en_camino: { 
      icon: MapPin, 
      label: 'En Camino', 
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600'
    },
    en_proceso: { 
      icon: Hammer, 
      label: 'En Proceso', 
      color: 'bg-orange-500',
      textColor: 'text-orange-600'
    },
    completado: { 
      icon: CheckCheck, 
      label: 'Completado', 
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    confirmado: { 
      icon: CheckCheck, 
      label: 'Confirmado', 
      color: 'bg-green-700',
      textColor: 'text-green-700'
    }
  };

  const allStates = ['aplicado', 'aceptado', 'en_camino', 'en_proceso', 'completado', 'confirmado'];
  const currentStateIndex = allStates.indexOf(currentState);

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold mb-4">Estado del Trabajo</h3>
        <div className="space-y-4">
          {allStates.map((stateKey, index) => {
            const config = stateConfig[stateKey as keyof typeof stateConfig];
            const stateData = states.find(s => s.state === stateKey);
            const isCompleted = index <= currentStateIndex;
            const isCurrent = stateKey === currentState;
            const Icon = config.icon;

            return (
              <div key={stateKey} className="flex items-start gap-3">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                    ${isCompleted 
                      ? `${config.color} text-white shadow-lg` 
                      : 'bg-gray-200 text-gray-400'
                    }
                    ${isCurrent ? 'ring-4 ring-blue-200 scale-110' : ''}
                  `}>
                    <Icon className="h-4 w-4" />
                  </div>
                  {index < allStates.length - 1 && (
                    <div className={`
                      w-0.5 h-8 mt-1 transition-colors duration-300
                      ${isCompleted ? 'bg-green-300' : 'bg-gray-200'}
                    `} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`
                      font-medium transition-colors duration-300
                      ${isCompleted ? config.textColor : 'text-gray-400'}
                    `}>
                      {config.label}
                    </span>
                    {isCurrent && (
                      <Badge variant="default" className="text-xs">
                        Actual
                      </Badge>
                    )}
                  </div>
                  
                  {stateData && (
                    <div className="text-sm text-muted-foreground">
                      <p className="mb-1">
                        {new Date(stateData.created_at).toLocaleString('es-CL', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-xs">
                        por {stateData.profiles.first_name} {stateData.profiles.last_name}
                      </p>
                      {stateData.message && (
                        <p className="text-xs italic mt-1">"{stateData.message}"</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default JobStateTimeline;