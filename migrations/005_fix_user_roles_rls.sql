-- ============================================================
-- Migration 005 : correction de la récursion infinie sur user_roles
--
-- Les policies de la migration 001 interrogeaient `public.user_roles`
-- depuis une policy posée SUR `public.user_roles`. PostgreSQL réévalue
-- alors la policy pour la sous-requête, en boucle :
--   ERROR: infinite recursion detected in policy for relation "user_roles"
--
-- La fonction `public.is_admin()` (SECURITY DEFINER, définie en 001) contourne
-- RLS : c'est elle qu'il faut appeler. Elle était déclarée mais jamais utilisée.
-- ============================================================

-- `is_admin` est redéfinie ici pour garantir sa présence et son search_path.
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- ── Remplacement des policies récursives ────────────────────────────────────
DROP POLICY IF EXISTS "admins_read_all_roles"  ON public.user_roles;
DROP POLICY IF EXISTS "admins_insert_roles"    ON public.user_roles;
DROP POLICY IF EXISTS "admins_update_roles"    ON public.user_roles;
DROP POLICY IF EXISTS "users_read_own_role"    ON public.user_roles;

CREATE POLICY "admins_read_all_roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "admins_insert_roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "admins_update_roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Absente de la migration 001 : sans elle, révoquer un rôle était impossible
-- pour tout client passant par RLS.
CREATE POLICY "admins_delete_roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "users_read_own_role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
