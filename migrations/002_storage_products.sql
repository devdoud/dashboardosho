-- ============================================================
-- Migration 002 : Supabase Storage bucket "products"
-- ============================================================

-- Créer le bucket public pour les images produits
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  true,
  5242880,  -- 5 Mo max par fichier
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Politique : lecture publique (images visibles dans l'app mobile)
CREATE POLICY "products_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'products');

-- Politique : upload réservé aux admins authentifiés
CREATE POLICY "products_admin_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'products'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Politique : suppression réservée aux admins
CREATE POLICY "products_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'products'
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
