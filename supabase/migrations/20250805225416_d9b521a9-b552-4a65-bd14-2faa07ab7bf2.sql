-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('trabajador', 'empleador')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  location TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create jobs table
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('agricultura', 'comercio', 'oficios', 'domesticos', 'transporte')),
  payment_amount INTEGER NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('por_hora', 'por_dia', 'por_trabajo')),
  location TEXT NOT NULL,
  date_needed DATE NOT NULL,
  duration_hours INTEGER,
  status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'asignado', 'completado', 'cancelado')),
  assigned_to UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Create applications table
CREATE TABLE public.applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aceptada', 'rechazada')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_id, worker_id)
);

-- Enable RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Create chats table
CREATE TABLE public.chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  employer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_id, worker_id, employer_id)
);

-- Enable RLS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for jobs
CREATE POLICY "Everyone can view active jobs" 
ON public.jobs FOR SELECT 
USING (status = 'activo' OR employer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Employers can insert jobs" 
ON public.jobs FOR INSERT 
WITH CHECK (employer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND user_type = 'empleador'));

CREATE POLICY "Employers can update their own jobs" 
ON public.jobs FOR UPDATE 
USING (employer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- RLS Policies for applications
CREATE POLICY "Workers and job owners can view applications" 
ON public.applications FOR SELECT 
USING (
  worker_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
  job_id IN (SELECT id FROM public.jobs WHERE employer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
);

CREATE POLICY "Workers can insert applications" 
ON public.applications FOR INSERT 
WITH CHECK (worker_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid() AND user_type = 'trabajador'));

CREATE POLICY "Job owners can update applications" 
ON public.applications FOR UPDATE 
USING (job_id IN (SELECT id FROM public.jobs WHERE employer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())));

-- RLS Policies for chats
CREATE POLICY "Chat participants can view chats" 
ON public.chats FOR SELECT 
USING (
  worker_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
  employer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Chat participants can insert chats" 
ON public.chats FOR INSERT 
WITH CHECK (
  worker_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
  employer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- RLS Policies for messages
CREATE POLICY "Chat participants can view messages" 
ON public.messages FOR SELECT 
USING (
  chat_id IN (
    SELECT id FROM public.chats WHERE 
    worker_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
    employer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Chat participants can insert messages" 
ON public.messages FOR INSERT 
WITH CHECK (
  sender_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND
  chat_id IN (
    SELECT id FROM public.chats WHERE 
    worker_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
    employer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, user_type, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'trabajador'),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();