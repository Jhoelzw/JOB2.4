/*
  # WorkMatch Chile - Día 3: Estados de Trabajo y Notificaciones

  1. Nuevas Tablas
    - `job_states` - Estados del trabajo con timestamps
    - `notifications` - Sistema de notificaciones in-app
    - `job_photos` - Fotos de progreso del trabajo
  
  2. Actualizaciones
    - Tabla `applications` con estado aceptado
    - Tabla `messages` con indicador de leído
  
  3. Seguridad
    - RLS habilitado en todas las tablas
    - Políticas para trabajadores y empleadores
*/

-- Crear tabla de estados de trabajo
CREATE TABLE IF NOT EXISTS public.job_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  state TEXT NOT NULL CHECK (state IN ('aplicado', 'aceptado', 'en_camino', 'en_proceso', 'completado', 'confirmado')),
  changed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT, -- Mensaje automático generado
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.job_states ENABLE ROW LEVEL SECURITY;

-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('message', 'state_change', 'application', 'job_update')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Crear tabla de fotos de progreso
CREATE TABLE IF NOT EXISTS public.job_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.job_photos ENABLE ROW LEVEL SECURITY;

-- Añadir columna para mensajes no leídos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'is_read'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Añadir columna para ubicación estimada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'estimated_arrival'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN estimated_arrival TEXT;
  END IF;
END $$;

-- Políticas RLS para job_states
CREATE POLICY "Job participants can view job states" 
ON public.job_states FOR SELECT 
USING (
  job_id IN (
    SELECT j.id FROM public.jobs j
    JOIN public.profiles p ON j.employer_id = p.id
    WHERE p.user_id = auth.uid()
  ) OR
  application_id IN (
    SELECT a.id FROM public.applications a
    JOIN public.profiles p ON a.worker_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Job participants can insert job states" 
ON public.job_states FOR INSERT 
WITH CHECK (
  changed_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Políticas RLS para notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT 
USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "System can insert notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications FOR UPDATE 
USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Políticas RLS para job_photos
CREATE POLICY "Job participants can view job photos" 
ON public.job_photos FOR SELECT 
USING (
  job_id IN (
    SELECT j.id FROM public.jobs j
    JOIN public.profiles p ON j.employer_id = p.id
    WHERE p.user_id = auth.uid()
  ) OR
  application_id IN (
    SELECT a.id FROM public.applications a
    JOIN public.profiles p ON a.worker_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Job participants can insert job photos" 
ON public.job_photos FOR INSERT 
WITH CHECK (
  uploaded_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
);

-- Actualizar política de mensajes para incluir is_read
DROP POLICY IF EXISTS "Chat participants can update messages" ON public.messages;
CREATE POLICY "Chat participants can update messages" 
ON public.messages FOR UPDATE 
USING (
  chat_id IN (
    SELECT id FROM public.chats WHERE 
    worker_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
    employer_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- Función para crear notificación automática
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_job_id UUID DEFAULT NULL,
  p_application_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, job_id, application_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_job_id, p_application_id)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para cambiar estado de trabajo
CREATE OR REPLACE FUNCTION public.change_job_state(
  p_job_id UUID,
  p_application_id UUID,
  p_new_state TEXT,
  p_changed_by UUID,
  p_auto_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  state_id UUID;
  job_title TEXT;
  worker_id UUID;
  employer_id UUID;
  worker_name TEXT;
  employer_name TEXT;
BEGIN
  -- Obtener información del trabajo
  SELECT j.title, j.employer_id, a.worker_id
  INTO job_title, employer_id, worker_id
  FROM public.jobs j
  JOIN public.applications a ON a.job_id = j.id
  WHERE j.id = p_job_id AND a.id = p_application_id;
  
  -- Obtener nombres
  SELECT first_name || ' ' || last_name INTO worker_name
  FROM public.profiles WHERE id = worker_id;
  
  SELECT first_name || ' ' || last_name INTO employer_name
  FROM public.profiles WHERE id = employer_id;
  
  -- Insertar nuevo estado
  INSERT INTO public.job_states (job_id, application_id, state, changed_by, message)
  VALUES (p_job_id, p_application_id, p_new_state, p_changed_by, p_auto_message)
  RETURNING id INTO state_id;
  
  -- Crear notificaciones
  IF p_changed_by = worker_id THEN
    -- Notificar al empleador
    PERFORM public.create_notification(
      employer_id,
      'state_change',
      'Estado de trabajo actualizado',
      worker_name || ' cambió el estado a: ' || p_new_state,
      p_job_id,
      p_application_id
    );
  ELSE
    -- Notificar al trabajador
    PERFORM public.create_notification(
      worker_id,
      'state_change',
      'Estado de trabajo actualizado',
      employer_name || ' cambió el estado a: ' || p_new_state,
      p_job_id,
      p_application_id
    );
  END IF;
  
  RETURN state_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_job_states_job_id ON public.job_states(job_id);
CREATE INDEX IF NOT EXISTS idx_job_states_application_id ON public.job_states(application_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_job_photos_job_id ON public.job_photos(job_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON public.messages(is_read);