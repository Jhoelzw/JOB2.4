-- Add new profile fields for enhanced functionality
ALTER TABLE public.profiles 
ADD COLUMN categories TEXT[], -- Multiple categories for workers
ADD COLUMN hourly_rate INTEGER, -- Personal hourly rate in CLP
ADD COLUMN comuna TEXT, -- Chilean commune
ADD COLUMN whatsapp TEXT, -- WhatsApp number
ADD COLUMN experience TEXT, -- Work experience
ADD COLUMN employer_type TEXT, -- 'personal' or 'empresa' for employers
ADD COLUMN rut TEXT; -- Chilean RUT for employers

-- Create index for better performance on categories search
CREATE INDEX idx_profiles_categories ON public.profiles USING GIN(categories);

-- Create index for comuna searches
CREATE INDEX idx_profiles_comuna ON public.profiles (comuna);

-- Add constraint for employer_type
ALTER TABLE public.profiles 
ADD CONSTRAINT check_employer_type 
CHECK (employer_type IS NULL OR employer_type IN ('personal', 'empresa'));

-- Add constraint for user_type
ALTER TABLE public.profiles 
ADD CONSTRAINT check_user_type 
CHECK (user_type IN ('trabajador', 'empleador'));

-- Update existing profiles to have empty arrays for categories if they are workers
UPDATE public.profiles 
SET categories = '{}' 
WHERE user_type = 'trabajador' AND categories IS NULL;