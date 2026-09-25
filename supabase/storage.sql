-- ==============================================================================
-- Supabase Storage Configuration for LaVIDA
-- Creates the 'product-images' bucket and sets up security policies
-- ==============================================================================

-- 1. Create a public storage bucket for product imagery
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

-- 2. Policy: Anyone can view product images
DROP POLICY IF EXISTS "Public product image view" ON storage.objects;
CREATE POLICY "Public product image view"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'product-images');

-- 3. Policy: Only admins can upload product images
DROP POLICY IF EXISTS "Admin product image upload" ON storage.objects;
CREATE POLICY "Admin product image upload"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'product-images'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role::text = 'admin'
        )
    );

-- 4. Policy: Only admins can update product images
DROP POLICY IF EXISTS "Admin product image update" ON storage.objects;
CREATE POLICY "Admin product image update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'product-images'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role::text = 'admin'
        )
    );

-- 5. Policy: Only admins can delete product images
DROP POLICY IF EXISTS "Admin product image delete" ON storage.objects;
CREATE POLICY "Admin product image delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'product-images'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role::text = 'admin'
        )
    );
