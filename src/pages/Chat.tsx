import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Send, MapPin, Clock, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import JobStateTimeline from '@/components/JobStateTimeline';
import ChatActionButtons from '@/components/ChatActionButtons';

interface Message {
  id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  estimated_arrival?: string;
  profiles: {
    first_name: string;
    last_name: string;
    user_id: string;
  };
}

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

interface Application {
  id: string;
  job_id: string;
  worker_id: string;
  status: string;
}

interface ChatRoom {
  id: string;
  job_id: string;
  worker_id: string;
  employer_id: string;
  applications?: Application;
  jobs: {
    title: string;
  };
  worker: {
    first_name: string;
    last_name: string;
  };
  employer: {
    first_name: string;
    last_name: string;
  };
}

const Chat = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState<ChatRoom[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [jobStates, setJobStates] = useState<JobState[]>([]);
  const [currentState, setCurrentState] = useState<string>('aceptado');
  const [newMessage, setNewMessage] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    fetchChats();
  }, [profile]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
      fetchJobStates(selectedChat.job_id, selectedChat.applications?.id);
      
      // Subscribe to new messages
      const channel = supabase
        .channel('messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=eq.${selectedChat.id}`
          },
          (payload) => {
            const newMsg = payload.new as any;
            fetchMessages(selectedChat.id); // Refresh messages
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'job_states'
          },
          (payload) => {
            if (selectedChat.applications?.id) {
              fetchJobStates(selectedChat.job_id, selectedChat.applications.id);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedChat]);

  const fetchChats = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('chats')
      .select(`
        *,
        jobs:job_id (title),
        worker:profiles!chats_worker_id_fkey (first_name, last_name),
        employer:profiles!chats_employer_id_fkey (first_name, last_name),
        applications:applications!applications_job_id_fkey (id, status)
      `)
      .or(`worker_id.eq.${profile.id},employer_id.eq.${profile.id}`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Solo mostrar chats donde la aplicación fue aceptada
      const acceptedChats = data.filter(chat => 
        chat.applications && chat.applications.status === 'aceptada'
      ) as ChatRoom[];
      setChats(acceptedChats);
      if (data.length > 0 && !selectedChat) {
        setSelectedChat(acceptedChats[0] as ChatRoom);
      }
    }
    setLoading(false);
  };

  const fetchMessages = async (chatId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        profiles:sender_id (first_name, last_name, user_id)
      `)
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
      // Marcar mensajes como leídos
      markMessagesAsRead(chatId);
    }
  };

  const fetchJobStates = async (jobId: string, applicationId?: string) => {
    if (!applicationId) return;

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
      setJobStates(data);
      // Obtener el estado actual (último estado)
      if (data.length > 0) {
        setCurrentState(data[data.length - 1].state);
      }
    }
  };

  const markMessagesAsRead = async (chatId: string) => {
    if (!profile) return;

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('chat_id', chatId)
      .neq('sender_id', profile.id)
      .eq('is_read', false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !profile) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        chat_id: selectedChat.id,
        sender_id: profile.id,
        content: newMessage.trim(),
        estimated_arrival: estimatedTime || null
      });

    if (!error) {
      setNewMessage('');
      setEstimatedTime('');
      fetchMessages(selectedChat.id);
    }
  };

  const handleStateChange = async (newState: string, autoMessage: string) => {
    if (!selectedChat || !profile || !selectedChat.applications) return;

    try {
      // Cambiar estado usando la función de la base de datos
      const { error } = await supabase.rpc('change_job_state', {
        p_job_id: selectedChat.job_id,
        p_application_id: selectedChat.applications.id,
        p_new_state: newState,
        p_changed_by: profile.id,
        p_auto_message: autoMessage
      });

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo cambiar el estado",
          variant: "destructive"
        });
        return;
      }

      // Enviar mensaje automático al chat
      await supabase
        .from('messages')
        .insert({
          chat_id: selectedChat.id,
          sender_id: profile.id,
          content: autoMessage
        });

      // Actualizar estados y mensajes
      if (selectedChat.applications) {
        fetchJobStates(selectedChat.job_id, selectedChat.applications.id);
      }
      fetchMessages(selectedChat.id);

      toast({
        title: "Estado actualizado",
        description: `Estado cambiado a: ${newState}`,
      });
    } catch (error) {
      console.error('Error changing state:', error);
    }
  };

  const handleLocationShare = () => {
    const locationMessage = estimatedTime 
      ? `📍 Estoy a ${estimatedTime} minutos del lugar`
      : "📍 Compartiendo mi ubicación";
    
    if (selectedChat && profile) {
      supabase
        .from('messages')
        .insert({
          chat_id: selectedChat.id,
          sender_id: profile.id,
          content: locationMessage,
          estimated_arrival: estimatedTime || null
        })
        .then(() => {
          fetchMessages(selectedChat.id);
          setEstimatedTime('');
        });
    }
  };

  const handlePhotoUpload = () => {
    // Simular subida de foto
    const photoMessage = "📸 Foto de progreso subida";
    
    if (selectedChat && profile) {
      supabase
        .from('messages')
        .insert({
          chat_id: selectedChat.id,
          sender_id: profile.id,
          content: photoMessage
        })
        .then(() => {
          fetchMessages(selectedChat.id);
        });
    }
  };

  const handleTimeEstimate = () => {
    const time = prompt("¿En cuántos minutos llegas?");
    if (time && selectedChat && profile) {
      const timeMessage = `⏰ Llego en ${time} minutos`;
      
      supabase
        .from('messages')
        .insert({
          chat_id: selectedChat.id,
          sender_id: profile.id,
          content: timeMessage,
          estimated_arrival: time
        })
        .then(() => {
          fetchMessages(selectedChat.id);
        });
    }
  };

  const getOtherParticipant = (chat: ChatRoom) => {
    if (profile?.id === chat.worker_id) {
      return chat.employer;
    }
    return chat.worker;
  };

  if (loading) {
    return <div className="p-4">Cargando chats...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <h1 className="text-xl font-bold">Mensajes</h1>
          {selectedChat && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowTimeline(!showTimeline)}
            >
              {showTimeline ? 'Ocultar' : 'Ver'} Estado
            </Button>
          )}
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)] relative">
        {/* Chat List */}
        <div className="w-1/3 border-r bg-card">
          <div className="p-4">
            <h2 className="font-semibold mb-4">Conversaciones</h2>
            {chats.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No hay conversaciones activas. Los chats se habilitan cuando un empleador acepta tu aplicación.
              </p>
            ) : (
              <div className="space-y-2">
                {chats.map((chat) => {
                  const otherUser = getOtherParticipant(chat);
                  return (
                    <Card 
                      key={chat.id}
                      className={`cursor-pointer transition-colors ${
                        selectedChat?.id === chat.id ? 'bg-primary/10' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedChat(chat)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {otherUser.first_name[0]}{otherUser.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {otherUser.first_name} {otherUser.last_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {chat.jobs.title}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 flex flex-col">
          {selectedChat ? (
            <>
              <div className="p-4 border-b bg-card">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {getOtherParticipant(selectedChat).first_name[0]}
                      {getOtherParticipant(selectedChat).last_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {getOtherParticipant(selectedChat).first_name} {getOtherParticipant(selectedChat).last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedChat.jobs.title}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-b bg-muted/30">
                <ChatActionButtons
                  currentState={currentState}
                  userType={profile?.user_type || 'trabajador'}
                  onStateChange={handleStateChange}
                  onLocationShare={handleLocationShare}
                  onPhotoUpload={handlePhotoUpload}
                  onTimeEstimate={handleTimeEstimate}
                />
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((message) => {
                  const isMyMessage = message.profiles.user_id === profile?.user_id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                          isMyMessage
                            ? 'bg-blue-500 text-white rounded-br-sm'
                            : 'bg-gray-200 text-gray-900 rounded-bl-sm'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        {message.estimated_arrival && (
                          <p className="text-xs opacity-70 mt-1">
                            ⏰ Tiempo estimado: {message.estimated_arrival} min
                          </p>
                        )}
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(message.created_at).toLocaleTimeString('es-CL', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 border-t bg-card">
                {estimatedTime && (
                  <div className="mb-2 p-2 bg-blue-50 rounded text-sm">
                    ⏰ Tiempo estimado: {estimatedTime} minutos
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setEstimatedTime('')}
                      className="ml-2 h-auto p-1"
                    >
                      ✕
                    </Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <Button onClick={sendMessage}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Selecciona una conversación para empezar
            </div>
          )}
        </div>

        {/* Timeline Sidebar */}
        {showTimeline && selectedChat && (
          <div className="w-80 border-l bg-card p-4 overflow-y-auto">
            <JobStateTimeline 
              states={jobStates}
              currentState={currentState}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;