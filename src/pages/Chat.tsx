import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    user_id: string;
  };
}

interface ChatRoom {
  id: string;
  job_id: string;
  worker_id: string;
  employer_id: string;
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
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChats();
  }, [profile]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
      
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
        employer:profiles!chats_employer_id_fkey (first_name, last_name)
      `)
      .or(`worker_id.eq.${profile.id},employer_id.eq.${profile.id}`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setChats(data as ChatRoom[]);
      if (data.length > 0 && !selectedChat) {
        setSelectedChat(data[0] as ChatRoom);
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
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !profile) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        chat_id: selectedChat.id,
        sender_id: profile.id,
        content: newMessage.trim()
      });

    if (!error) {
      setNewMessage('');
      fetchMessages(selectedChat.id);
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
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Chat List */}
        <div className="w-1/3 border-r bg-card">
          <div className="p-4">
            <h2 className="font-semibold mb-4">Conversaciones</h2>
            {chats.length === 0 ? (
              <p className="text-muted-foreground text-sm">No hay conversaciones</p>
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
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
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
      </div>
    </div>
  );
};

export default Chat;