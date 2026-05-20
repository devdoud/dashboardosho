-- ============================================================
-- Migration 001 : user_roles table + RLS policies
-- ============================================================

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('admin', 'tailor', 'customer')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Admins can read all roles
CREATE POLICY "admins_read_all_roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Admins can insert roles
CREATE POLICY "admins_insert_roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Admins can update roles
CREATE POLICY "admins_update_roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Users can read their own role
CREATE POLICY "users_read_own_role"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================
-- Helper function: check if user is admin (used in middleware)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'admin'
  );
$$;

-- ============================================================
-- Seed: promote the first user to admin
-- Run this manually after creating your first user:
--
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('<YOUR_USER_UUID>', 'admin')
-- ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
-- ============================================================
