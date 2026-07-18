-- Create saakh_tasks table
CREATE TABLE IF NOT EXISTS public.saakh_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'low',
    completed BOOLEAN DEFAULT false,
    category TEXT,
    insight TEXT,
    button_text TEXT
);

-- Enable RLS
ALTER TABLE public.saakh_tasks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their own tasks" ON public.saakh_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own tasks" ON public.saakh_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own tasks" ON public.saakh_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tasks" ON public.saakh_tasks FOR DELETE USING (auth.uid() = user_id);
