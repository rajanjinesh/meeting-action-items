-- Schema for Meeting Action Items
CREATE TABLE IF NOT EXISTS public.action_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  owner TEXT NOT NULL DEFAULT 'unspecified',
  due_date TEXT NOT NULL DEFAULT 'unspecified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;

-- Allow INSERT for action_items (for anonymous and authenticated roles)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'action_items' AND policyname = 'Allow insert for action_items'
  ) THEN
    CREATE POLICY "Allow insert for action_items"
    ON public.action_items
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
  END IF;
END $$;

-- Allow SELECT for action_items (for anonymous and authenticated roles)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'action_items' AND policyname = 'Allow select for action_items'
  ) THEN
    CREATE POLICY "Allow select for action_items"
    ON public.action_items
    FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;
END $$;
