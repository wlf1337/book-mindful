-- Create table for storing push subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- Create table for notification settings
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  daily_reminder_enabled BOOLEAN NOT NULL DEFAULT false,
  reminder_time TIME NOT NULL DEFAULT '20:00:00',
  goal_notifications BOOLEAN NOT NULL DEFAULT true,
  streak_notifications BOOLEAN NOT NULL DEFAULT true,
  completion_notifications BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for push_subscriptions
CREATE POLICY "Users can view their own subscriptions" 
ON public.push_subscriptions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions" 
ON public.push_subscriptions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" 
ON public.push_subscriptions FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions" 
ON public.push_subscriptions FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for notification_settings
CREATE POLICY "Users can view their own settings" 
ON public.notification_settings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" 
ON public.notification_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
ON public.notification_settings FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" 
ON public.notification_settings FOR DELETE 
USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();