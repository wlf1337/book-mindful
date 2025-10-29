-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create ai_prompts table
CREATE TABLE public.ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_type TEXT NOT NULL UNIQUE,
  system_prompt TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on ai_prompts
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_prompts
CREATE POLICY "Anyone can view prompts"
ON public.ai_prompts
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage prompts"
ON public.ai_prompts
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create trigger for ai_prompts updated_at
CREATE TRIGGER update_ai_prompts_updated_at
BEFORE UPDATE ON public.ai_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default prompts
INSERT INTO public.ai_prompts (prompt_type, system_prompt, description) VALUES
(
  'summary',
  'You are a helpful assistant that creates personalized book summaries. Based on the book information and the user''s notes, create a concise, insightful summary that highlights the aspects the user found most important. Focus on the themes and ideas reflected in their notes.',
  'Creates a personalized summary based on user notes'
),
(
  'takeaways',
  'You are a helpful assistant that extracts key takeaways from books. Based on the book information and the user''s notes, identify and present the most important lessons, insights, and actionable points. Format them as clear, memorable bullet points.',
  'Extracts key takeaways and lessons'
),
(
  'action_plan',
  'You are a helpful assistant that creates action plans. Based on the book information and the user''s notes, develop a practical, step-by-step implementation plan. Focus on actionable steps the user can take to apply the book''s concepts to their life or work.',
  'Creates a practical action/implementation plan'
),
(
  'custom',
  'You are a helpful assistant that processes book notes. Based on the book information and the user''s notes, respond to the user''s specific request or question. Be thorough, insightful, and tailored to what the user is asking for.',
  'Custom output based on user instructions'
);

-- Function to get or create user profile by email
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(_email TEXT)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE email = _email LIMIT 1
$$;

-- Insert admin role for specified email
-- Note: This will only work after the user signs up
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  admin_user_id := public.get_user_id_by_email('wolfgangpeters01@gmail.com');
  
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;