-- ============================================================
-- Migration 007 : buckets de stockage
--
-- La route /api/admin/upload créait le bucket manquant à la volée, en public,
-- à partir d'un nom fourni par le client. Elle applique désormais une liste
-- blanche stricte : les buckets doivent exister ici.
--
-- Corrige aussi l'incohérence de taille : la migration 002 plafonnait le
-- bucket `products` à 5 Mo alors que la route accepte 8 Mo — les fichiers
-- entre les deux échouaient avec un message obscur.
-- ============================================================

-- Bucket `products` : aligner la limite sur celle de la route (8 Mo).
UPDATE storage.buckets
SET file_size_limit    = 8388608,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'products';

-- Bucket `categories` : utilisé par la page Catégories, jamais créé par une
-- migration (il ne devait son existence qu'à la création implicite côté route).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'categories',
  'categories',
  true,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Lecture publique (images affichées dans l'app mobile)
DROP POLICY IF EXISTS "categories_public_read" ON storage.objects;
CREATE POLICY "categories_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'categories');

-- Écriture réservée aux admins — via is_admin() pour éviter la sous-requête
-- récursive sur user_roles (cf. migration 005).
DROP POLICY IF EXISTS "categories_admin_upload" ON storage.objects;
CREATE POLICY "categories_admin_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'categories' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "categories_admin_delete" ON storage.objects;
CREATE POLICY "categories_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'categories' AND public.is_admin(auth.uid()));

-- Réécriture des policies `products` de la migration 002 sur le même modèle :
-- elles interrogeaient user_roles directement.
DROP POLICY IF EXISTS "products_admin_upload" ON storage.objects;
CREATE POLICY "products_admin_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'products' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "products_admin_delete" ON storage.objects;
CREATE POLICY "products_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'products' AND public.is_admin(auth.uid()));
