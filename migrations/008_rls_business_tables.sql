-- ============================================================
-- Migration 008 : RLS sur les tables métier
--
-- ⚠️  À RELIRE AVANT APPLICATION EN PRODUCTION ⚠️
--
-- Aucune migration ne définissait de policy sur `orders`, `order_items`,
-- `order_assignments`, `payment_attempts`, `addresses`, `fcm_tokens`,
-- `products` ni `categories`. Or le dashboard lisait plusieurs de ces tables
-- depuis le NAVIGATEUR avec la clé anon. Deux cas possibles, tous deux mauvais :
--
--   * les policies n'existent que dans le dashboard Supabase → non versionnées,
--     non reproductibles, non auditables ;
--   * RLS est désactivée → tout porteur de la clé anon (donc tout utilisateur
--     de l'app mobile) peut lire l'intégralité des commandes et des paiements.
--
-- Ce fichier pose un socle explicite. Les policies ci-dessous décrivent le
-- modèle attendu : client = ses propres lignes, tailleur = ses assignations,
-- admin = tout. VÉRIFIEZ qu'il couvre les requêtes de l'app mobile avant de
-- l'exécuter sur la base de production — commencez par un environnement de
-- préproduction.
--
-- Le dashboard, lui, n'en dépend plus : ses lectures sensibles passent par les
-- routes /api/admin/* en service_role, derrière requireAdmin().
-- ============================================================

-- ─── Helper : l'utilisateur courant est-il tailleur ? ────────────────────────
CREATE OR REPLACE FUNCTION public.is_tailor(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = 'tailor'
  );
$$;

REVOKE ALL ON FUNCTION public.is_tailor(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_tailor(uuid) TO authenticated;

-- ─── Catalogue : lecture publique, écriture admin ───────────────────────────
-- L'app mobile doit pouvoir parcourir le catalogue sans être connectée.

ALTER TABLE public.products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products_public_read" ON public.products;
CREATE POLICY "products_public_read"
  ON public.products FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "products_admin_write" ON public.products;
CREATE POLICY "products_admin_write"
  ON public.products FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "categories_public_read" ON public.categories;
CREATE POLICY "categories_public_read"
  ON public.categories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "categories_admin_write" ON public.categories;
CREATE POLICY "categories_admin_write"
  ON public.categories FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ─── Commandes ──────────────────────────────────────────────────────────────

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_owner_read" ON public.orders;
CREATE POLICY "orders_owner_read"
  ON public.orders FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Un tailleur voit les commandes qui lui sont assignées.
DROP POLICY IF EXISTS "orders_tailor_read" ON public.orders;
CREATE POLICY "orders_tailor_read"
  ON public.orders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.order_assignments oa
      WHERE oa.order_id = orders.id AND oa.tailor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "orders_admin_all" ON public.orders;
CREATE POLICY "orders_admin_all"
  ON public.orders FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "orders_owner_insert" ON public.orders;
CREATE POLICY "orders_owner_insert"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ─── Lignes de commande ─────────────────────────────────────────────────────

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_items_via_order" ON public.order_items;
CREATE POLICY "order_items_via_order"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (
          o.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.order_assignments oa
            WHERE oa.order_id = o.id AND oa.tailor_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "order_items_admin_write" ON public.order_items;
CREATE POLICY "order_items_admin_write"
  ON public.order_items FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ─── Assignations ───────────────────────────────────────────────────────────

ALTER TABLE public.order_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assignments_tailor_read" ON public.order_assignments;
CREATE POLICY "assignments_tailor_read"
  ON public.order_assignments FOR SELECT TO authenticated
  USING (tailor_id = auth.uid() OR public.is_admin(auth.uid()));

-- Le tailleur fait avancer SA propre assignation (accepter, démarrer, terminer).
DROP POLICY IF EXISTS "assignments_tailor_update" ON public.order_assignments;
CREATE POLICY "assignments_tailor_update"
  ON public.order_assignments FOR UPDATE TO authenticated
  USING (tailor_id = auth.uid() AND public.is_tailor(auth.uid()))
  WITH CHECK (tailor_id = auth.uid());

DROP POLICY IF EXISTS "assignments_admin_all" ON public.order_assignments;
CREATE POLICY "assignments_admin_all"
  ON public.order_assignments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ─── Paiements — jamais lisibles par un tiers ───────────────────────────────

ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_owner_read" ON public.payment_attempts;
CREATE POLICY "payments_owner_read"
  ON public.payment_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "payments_admin_write" ON public.payment_attempts;
CREATE POLICY "payments_admin_write"
  ON public.payment_attempts FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ─── Adresses ───────────────────────────────────────────────────────────────

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "addresses_owner_all" ON public.addresses;
CREATE POLICY "addresses_owner_all"
  ON public.addresses FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "addresses_admin_all" ON public.addresses;
CREATE POLICY "addresses_admin_all"
  ON public.addresses FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ─── Tokens FCM — un appareil n'appartient qu'à son propriétaire ────────────

ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fcm_owner_all" ON public.fcm_tokens;
CREATE POLICY "fcm_owner_all"
  ON public.fcm_tokens FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "fcm_admin_read" ON public.fcm_tokens;
CREATE POLICY "fcm_admin_read"
  ON public.fcm_tokens FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- ─── Avis ───────────────────────────────────────────────────────────────────

ALTER TABLE public.tailor_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_public_read" ON public.tailor_reviews;
CREATE POLICY "reviews_public_read"
  ON public.tailor_reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "reviews_customer_insert" ON public.tailor_reviews;
CREATE POLICY "reviews_customer_insert"
  ON public.tailor_reviews FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "reviews_admin_all" ON public.tailor_reviews;
CREATE POLICY "reviews_admin_all"
  ON public.tailor_reviews FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
