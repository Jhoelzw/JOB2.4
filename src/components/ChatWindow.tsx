import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: string;
  message: string;
  message_type: 'text' | 'system';
  created_at: string;
  sender_id: string;
  is_read: boolean;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface Job {
  id: string;
  title: string;
  status: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface ChatWindowProps {
  jobId: string;
  onClose: () => void;
}

const ChatWindow = ({ jobId, onClose }: ChatWindowProps) => {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (jobId && profile) {
      fetchJobDetails();
      fetchMessages();
      subscribeToMessages();
    }
  }, [jobId, profile]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchJobDetails = async () => {
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        status,
        profiles:employer_id (first_name, last_name)
      `)
      .eq('id', jobId)
      .single();

    if (!error && data) {
      setJob(data as Job);
    }
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        profiles:sender_id (first_name, last_name)
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as Message[]);
      // Marcar mensajes como leídos
      markMessagesAsRead();
    }
    setLoading(false);
  };

  const markMessagesAsRead = async () => {
    if (!profile) return;

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('job_id', jobId)
      .neq('sender_id', profile.id)
      .eq('is_read', false);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `job_id=eq.${jobId}`
        },
        (payload) => {
          fetchMessages(); // Refetch to get profile data
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !profile) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        job_id: jobId,
        sender_id: profile.id,
        message: newMessage.trim(),
        message_type: 'text'
      });

    if (!error) {
      setNewMessage('');
      // Crear notificación para el otro usuario
      createNotification();
    } else {
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive"
      });
    }
  };

  const createNotification = async () => {
    if (!job || !profile) return;

    // Determinar el destinatario
    const isEmployer = profile.user_type === 'empleador';
    const recipientId = isEmployer ? job.assigned_to : job.profiles.id;

    if (recipientId) {
      await supabase
        .from('notifications')
        .insert({
          user_id: recipientId,
          job_id: jobId,
          type: 'message',
          title: 'Nuevo mensaje',
          message: `${profile.first_name} te envió un mensaje sobre "${job.title}"`
        });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="p-4">
          <div className="text-center">Cargando chat...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle className="text-lg">{job?.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Chat con {job?.profiles.first_name} {job?.profiles.last_name}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No hay mensajes aún.</p>
              <p className="text-sm">¡Envía el primer mensaje!</p>
            </div>
          ) : (
            messages.map((message) => {
              const isMyMessage = message.sender_id === profile?.id;
              const isSystemMessage = message.message_type === 'system';

              if (isSystemMessage) {
                return (
                  <div key={message.id} className="text-center">
                    <div className="inline-block bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                      {message.message}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(message.created_at).toLocaleTimeString('es-CL', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={message.id}
                  className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start gap-2 max-w-xs ${isMyMessage ? 'flex-row-reverse' : ''}`}>
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {message.profiles.first_name[0]}{message.profiles.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div
                        className={`px-3 py-2 rounded-lg ${
                          isMyMessage
                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                            : 'bg-muted rounded-bl-sm'
                        }`}
                      >
                        <p className="text-sm">{message.message}</p>
                      </div>
                      <div className={`text-xs text-muted-foreground mt-1 ${isMyMessage ? 'text-right' : ''}`}>
                        {new Date(message.created_at).toLocaleTimeString('es-CL', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe un mensaje..."
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatWindow;