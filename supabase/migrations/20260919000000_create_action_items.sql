-- Migration: Create action_items table
CREATE TABLE IF NOT EXISTS public.action_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  owner TEXT NOT NULL DEFAULT 'unspecified',
  due_date TEXT NOT NULL DEFAULT 'unspecified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
