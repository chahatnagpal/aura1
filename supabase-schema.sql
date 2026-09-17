-- ==============================================================================
-- AURA LIFESTYLE - PAKISTANI E-COMMERCE STORE DATABASE SCHEMA & RLS POLICIES
-- ==============================================================================
-- This script creates all required tables, Row Level Security (RLS) policies,
-- storage buckets, and initial Pakistani lifestyle store seed data.
-- Run this entire script in your Supabase SQL Editor (https://app.supabase.com).
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Custom Types if needed
DO $$ BEGIN
    CREATE TYPE order_status_type AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status_type AS ENUM ('unpaid', 'paid', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- TABLE: profiles
-- Stores customer and admin profile details linked to auth.users
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    address TEXT,
    city TEXT DEFAULT 'Karachi',
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABLE: categories
-- Product categories (e.g. Fashion Accessories, Jewelry, Beauty, Small Gifts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    image_url TEXT,
    description TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABLE: products
-- Main product catalog with PKR pricing, stock, sale flags, and category link
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    compare_at_price NUMERIC(10, 2) CHECK (compare_at_price IS NULL OR compare_at_price >= price),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    low_stock_threshold INT DEFAULT 5,
    is_featured BOOLEAN DEFAULT FALSE,
    is_sale BOOLEAN DEFAULT FALSE,
    is_new BOOLEAN DEFAULT TRUE,
    rating NUMERIC(3, 2) DEFAULT 5.0,
    reviews_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABLE: product_images
-- Multiple images for products (with primary image flag and ordering)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABLE: product_variants
-- Product variants (e.g., Color: Pastel Pink, Lilac; Size: Regular, Large)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. "Color" or "Size" or "Style"
    options JSONB NOT NULL DEFAULT '[]'::JSONB, -- e.g. ["Pastel Pink", "Mint Green", "Lavender"]
    price_modifier NUMERIC(10, 2) DEFAULT 0,
    stock_quantity INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABLE: cart_items
-- Customer shopping carts persisted in database for logged-in users
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    selected_variant_name TEXT,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABLE: wishlist_items
-- Customer wishlist items
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wishlist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- ------------------------------------------------------------------------------
-- TABLE: orders
-- Customer orders with Pakistani shipping details, COD/Bank transfer, status
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    city TEXT NOT NULL,
    landmark TEXT,
    payment_method TEXT NOT NULL DEFAULT 'cod', -- 'cod', 'bank_transfer', 'jazzcash', 'easypaisa'
    payment_status TEXT NOT NULL DEFAULT 'unpaid', -- 'unpaid', 'paid'
    order_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'shipped', 'delivered', 'cancelled'
    courier_name TEXT, -- e.g. 'TCS', 'Leopards', 'Trax', 'Call Courier'
    tracking_number TEXT,
    subtotal NUMERIC(10, 2) NOT NULL,
    shipping_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(10, 2) NOT NULL,
    coupon_code TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABLE: order_items
-- Line items for each placed order
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    variant_title TEXT,
    price NUMERIC(10, 2) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    total_price NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TABLE: coupons
-- Discount codes for checkout (e.g. AURA10, WELCOME5, FREESHIP)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free_shipping')),
    discount_value NUMERIC(10, 2) NOT NULL,
    min_order_amount NUMERIC(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. HELPER FUNCTIONS & TRIGGERS
-- ==============================================================================

-- Function to check if current authenticated user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = TRUE
    );
$$;

-- Trigger to automatically create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone, address, city, is_admin)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Customer'),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'address', ''),
        COALESCE(NEW.raw_user_meta_data->>'city', 'Karachi'),
        COALESCE((NEW.raw_user_meta_data->>'is_admin')::BOOLEAN, FALSE)
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Drop trigger if already exists then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update product stock when an order is placed
CREATE OR REPLACE FUNCTION public.handle_order_stock_deduction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.product_id IS NOT NULL THEN
        UPDATE public.products
        SET stock_quantity = GREATEST(0, stock_quantity - NEW.quantity),
            updated_at = NOW()
        WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_item_created ON public.order_items;
CREATE TRIGGER on_order_item_created
    AFTER INSERT ON public.order_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_order_stock_deduction();

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- RLS: profiles
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own profile or admin can read all" ON public.profiles;
CREATE POLICY "Users can read own profile or admin can read all"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id OR public.is_admin());

-- ------------------------------------------------------------------------------
-- RLS: categories (Public can read, Admins can insert/update/delete)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories"
    ON public.categories FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
CREATE POLICY "Admins can insert categories"
    ON public.categories FOR INSERT
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins can update categories"
    ON public.categories FOR UPDATE
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
CREATE POLICY "Admins can delete categories"
    ON public.categories FOR DELETE
    USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- RLS: products (Public can read, Admins can insert/update/delete)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view products" ON public.products;
CREATE POLICY "Public can view products"
    ON public.products FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Admins can insert products"
    ON public.products FOR INSERT
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins can update products"
    ON public.products FOR UPDATE
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products"
    ON public.products FOR DELETE
    USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- RLS: product_images (Public can read, Admins can insert/update/delete)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view product images" ON public.product_images;
CREATE POLICY "Public can view product images"
    ON public.product_images FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins can insert product images" ON public.product_images;
CREATE POLICY "Admins can insert product images"
    ON public.product_images FOR INSERT
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update product images" ON public.product_images;
CREATE POLICY "Admins can update product images"
    ON public.product_images FOR UPDATE
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete product images" ON public.product_images;
CREATE POLICY "Admins can delete product images"
    ON public.product_images FOR DELETE
    USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- RLS: product_variants (Public can read, Admins can insert/update/delete)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view product variants" ON public.product_variants;
CREATE POLICY "Public can view product variants"
    ON public.product_variants FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins can manage product variants" ON public.product_variants;
CREATE POLICY "Admins can manage product variants"
    ON public.product_variants FOR ALL
    USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- RLS: cart_items (Authenticated users manage own cart)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own cart" ON public.cart_items;
CREATE POLICY "Users can manage own cart"
    ON public.cart_items FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- RLS: wishlist_items (Authenticated users manage own wishlist)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own wishlist" ON public.wishlist_items;
CREATE POLICY "Users can manage own wishlist"
    ON public.wishlist_items FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- RLS: orders
-- Customers can read their own orders.
-- Anyone (authenticated or guest) can create an order.
-- Admins can view and update all orders.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own orders or admin can view all" ON public.orders;
CREATE POLICY "Users can view own orders or admin can view all"
    ON public.orders FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Anyone can create an order" ON public.orders;
CREATE POLICY "Anyone can create an order"
    ON public.orders FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders"
    ON public.orders FOR UPDATE
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
CREATE POLICY "Admins can delete orders"
    ON public.orders FOR DELETE
    USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- RLS: order_items
-- Customers can view items in their own orders; Admins can view all.
-- Anyone can insert items for an order.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own order items or admin can view all" ON public.order_items;
CREATE POLICY "Users can view own order items or admin can view all"
    ON public.order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND (orders.user_id = auth.uid() OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
CREATE POLICY "Anyone can insert order items"
    ON public.order_items FOR INSERT
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- RLS: coupons (Public can read active coupons; Admins can manage all)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;
CREATE POLICY "Public can view active coupons"
    ON public.coupons FOR SELECT
    USING (is_active = TRUE OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons"
    ON public.coupons FOR ALL
    USING (public.is_admin());

-- ==============================================================================
-- 5. STORAGE BUCKET CONFIGURATION (product-images)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public can read product images
DROP POLICY IF EXISTS "Public can read product images storage" ON storage.objects;
CREATE POLICY "Public can read product images storage"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'product-images');

-- Authenticated admins can upload images
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
CREATE POLICY "Admins can upload product images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

-- Authenticated admins can update & delete images
DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
CREATE POLICY "Admins can update product images"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
CREATE POLICY "Admins can delete product images"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'product-images' AND public.is_admin());

-- ==============================================================================
-- 6. STARTER SEED DATA FOR PAKISTANI LIFESTYLE STORE
-- ==============================================================================

-- Clear existing sample data if re-running
DELETE FROM public.coupons;
DELETE FROM public.order_items;
DELETE FROM public.orders;
DELETE FROM public.product_images;
DELETE FROM public.product_variants;
DELETE FROM public.products;
DELETE FROM public.categories;

-- Insert Categories
INSERT INTO public.categories (id, name, slug, image_url, description, display_order)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'Fashion Accessories', 'fashion-accessories', 'https://images.unsplash.com/photo-1576053139778-7e32f2ae3cfd?w=600&auto=format&fit=crop&q=80', 'Trendy scrunchies, silk scarves, hair clips, claw pins, and stylish sunglasses.', 1),
    ('c2222222-2222-2222-2222-222222222222', 'Aesthetic Jewelry', 'aesthetic-jewelry', 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=crop&q=80', 'Minimalist 18k gold-plated necklaces, aesthetic rings, hoop earrings & evil eye bracelets.', 2),
    ('c3333333-3333-3333-3333-333333333333', 'Beauty & Skincare Tools', 'beauty-tools', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80', 'Jade rollers, Gua Sha stones, aesthetic makeup brush sets, and beauty blenders.', 3),
    ('c4444444-4444-4444-4444-444444444444', 'Bags & Organizers', 'bags-organizers', 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80', 'Aesthetic canvas tote bags, quilted travel cosmetic pouches, and jewelry storage boxes.', 4),
    ('c5555555-5555-5555-5555-555555555555', 'Cute Stationery & Gifts', 'cute-stationery', 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80', 'Pastel pastel notebooks, cute aesthetic pens, sticker sheets, and thoughtful small gifts.', 5),
    ('c6666666-6666-6666-6666-666666666666', 'Home & Lifestyle Decor', 'home-decor', 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600&auto=format&fit=crop&q=80', 'Aesthetic scented soy bubble candles, mini ceramic vases, and aesthetic desk sippers.', 6);

-- Insert Products with PKR Pricing
INSERT INTO public.products (id, name, slug, description, category_id, price, compare_at_price, stock_quantity, low_stock_threshold, is_featured, is_sale, is_new, rating, reviews_count)
VALUES
    -- 1. Fashion Accessories
    ('p1111111-1111-1111-1111-111111111101', 'Silk Satin Scrunchie Set (Pack of 5)', 'silk-satin-scrunchie-set-5', 'Premium soft silk satin hair scrunchies designed to prevent hair breakage and creasing. Comes in a chic pastel palette: Blush Pink, Champagne, Sage Green, Vanilla, and Muted Mauve.', 'c1111111-1111-1111-1111-111111111111', 650, 950, 45, 5, TRUE, TRUE, FALSE, 4.9, 38),
    ('p1111111-1111-1111-1111-111111111102', 'French Matte Claw Clip Trio', 'french-matte-claw-clip-trio', 'Durable non-slip rectangular claw clips made with eco-friendly acrylic and heavy-duty alloy springs. Perfect for all hair lengths and everyday casual styling.', 'c1111111-1111-1111-1111-111111111111', 599, 850, 30, 5, TRUE, FALSE, TRUE, 4.8, 24),
    ('p1111111-1111-1111-1111-111111111103', 'Retro Vintage Oval Sunglasses', 'retro-vintage-oval-sunglasses', 'Timeless 90s aesthetic oval sunglasses with UV400 protective lenses. Lightweight frame offering maximum comfort and instant effortless chic.', 'c1111111-1111-1111-1111-111111111111', 1199, 1699, 18, 4, FALSE, TRUE, FALSE, 4.7, 19),

    -- 2. Aesthetic Jewelry
    ('p2222222-2222-2222-2222-222222222201', 'Dainty Gold Pearl Pendant Necklace', 'dainty-gold-pearl-pendant-necklace', '18K gold-plated stainless steel chain with a genuine freshwater baroque mini pearl pendant. Hypoallergenic, tarnish-resistant, and water-friendly for daily wear.', 'c2222222-2222-2222-2222-222222222222', 1250, 1800, 25, 5, TRUE, TRUE, FALSE, 5.0, 52),
    ('p2222222-2222-2222-2222-222222222202', 'Chunky Twisted Croissant Hoop Earrings', 'chunky-twisted-croissant-hoops', 'Bestselling French Parisian style croissant ribbed hoop earrings in 18K gold finish. Extremely lightweight, comfortable for all-day wear without weighing down ears.', 'c2222222-2222-2222-2222-222222222222', 950, 1400, 35, 6, TRUE, FALSE, TRUE, 4.9, 41),
    ('p2222222-2222-2222-2222-222222222203', 'Celestial Moon & Star Layered Choker', 'celestial-moon-star-layered-choker', 'Two-in-one layered gold chain featuring a delicate crescent moon and cubic zirconia star charms. Adjustable length with lobster clasp.', 'c2222222-2222-2222-2222-222222222222', 1399, 1999, 12, 4, FALSE, TRUE, FALSE, 4.8, 17),
    ('p2222222-2222-2222-2222-222222222204', 'Minimalist Stacking Rings (Set of 6)', 'minimalist-stacking-rings-set-6', 'Curated set of 6 dainty stacking rings in textured, twisted, and signet designs. Mix and match across fingers for an understated aesthetic look.', 'c2222222-2222-2222-2222-222222222222', 850, 1200, 22, 5, TRUE, FALSE, TRUE, 4.6, 29),

    -- 3. Beauty & Skincare Tools
    ('p3333333-3333-3333-3333-333333333301', 'Natural Rose Quartz Gua Sha & Roller Duo', 'rose-quartz-gua-sha-roller-duo', 'Handcrafted 100% authentic Brazilian rose quartz facial roller and heart-shaped Gua Sha stone. Helps reduce facial puffiness, boost lymphatic drainage, and enhance serum absorption.', 'c3333333-3333-3333-3333-333333333333', 1499, 2200, 15, 3, TRUE, TRUE, FALSE, 4.9, 46),
    ('p3333333-3333-3333-3333-333333333302', 'Velvet Cloud Makeup Sponge Trio with Case', 'velvet-cloud-makeup-sponge-trio', 'Ultra-soft microfiber blender sponges that double in size when damp. Delivers an airbrushed, streak-free foundation and concealer finish with minimal product absorption.', 'c3333333-3333-3333-3333-333333333333', 750, 1100, 40, 8, FALSE, FALSE, TRUE, 4.7, 33),
    ('p3333333-3333-3333-3333-333333333303', 'Travel Makeup Brush Set with Leather Case (8 Pcs)', 'travel-makeup-brush-set-8-pcs', 'Compact set of 8 ultra-soft vegan synthetic makeup brushes with champagne gold ferrules, packaged in a travel-ready cylindrical magnetic case.', 'c3333333-3333-3333-3333-333333333333', 1850, 2500, 14, 4, TRUE, FALSE, FALSE, 4.9, 21),

    -- 4. Bags & Organizers
    ('p4444444-4444-4444-4444-444444444401', 'Aesthetic Corduroy Shoulder Tote Bag', 'aesthetic-corduroy-tote-bag', 'Spacious soft corduroy tote bag with magnetic snap closure and interior zip pocket. Fits a 13-inch laptop, planner, water bottle, and daily makeup essentials.', 'c4444444-4444-4444-4444-444444444444', 1650, 2250, 20, 5, TRUE, TRUE, FALSE, 4.8, 35),
    ('p4444444-4444-4444-4444-444444444402', 'Quilted Puffer Cosmetic Pouch', 'quilted-puffer-cosmetic-pouch', 'Cloud-soft quilted travel pouch with smooth gold zipper. Water-resistant lining inside, ideal for carrying everyday makeup, lip glosses, and skincare bottles.', 'c4444444-4444-4444-4444-444444444444', 899, 1300, 28, 5, FALSE, FALSE, TRUE, 4.7, 18),
    ('p4444444-4444-4444-4444-444444444403', 'Portable Travel Jewelry Box Organizer', 'portable-travel-jewelry-box-organizer', 'Luxurious PU leather compact jewelry case with soft velvet interior. Compartments for rings, necklaces, stud earrings, and bracelets with zip-around protection.', 'c4444444-4444-4444-4444-444444444444', 1299, 1899, 16, 4, TRUE, FALSE, FALSE, 5.0, 42),

    -- 5. Cute Stationery & Gifts
    ('p5555555-5555-5555-5555-555555555501', 'Aesthetic Hardcover Bullet Journal & Pen', 'aesthetic-hardcover-bullet-journal-pen', '160 GSM thick bleed-proof dotted pages with a ribbon bookmark, expandable inner pocket, and gold metallic matching gel pen. Perfect for journaling and study notes.', 'c5555555-5555-5555-5555-555555555555', 999, 1450, 32, 6, FALSE, TRUE, TRUE, 4.8, 27),
    ('p5555555-5555-5555-5555-555555555502', 'Pastel Aesthetic Highlighter Set (6 Colors)', 'pastel-aesthetic-highlighter-set-6', 'Soft mild-liner highlighters with dual chisel tips. No bleed-through on standard book pages. Ideal for study aesthetics, bullet journaling, and gift packages.', 'c5555555-5555-5555-5555-555555555555', 550, 799, 50, 10, FALSE, FALSE, TRUE, 4.9, 39),

    -- 6. Home & Lifestyle Decor
    ('p6666666-6666-6666-6666-666666666601', 'French Vanilla Scented Soy Bubble Candle', 'french-vanilla-soy-bubble-candle', 'Hand-poured 100% natural soy wax bubble cube candle scented with warm French vanilla and Madagascar amber. Clean-burning and serves as an aesthetic room decor accent.', 'c6666666-6666-6666-6666-666666666666', 850, 1250, 24, 4, TRUE, TRUE, FALSE, 4.9, 53),
    ('p6666666-6666-6666-6666-666666666602', 'Glass Aesthetic Tumbler with Glass Straw (500ml)', 'glass-aesthetic-tumbler-straw-500ml', 'Borosilicate clear glass iced coffee can tumbler with natural bamboo lid and reusable curved glass straw. Heat and cold resistant for iced coffees, boba, and matcha lattes.', 'c6666666-6666-6666-6666-666666666666', 1150, 1600, 19, 4, TRUE, FALSE, TRUE, 4.9, 44);

-- Insert Product Images
INSERT INTO public.product_images (product_id, image_url, is_primary, display_order)
VALUES
    ('p1111111-1111-1111-1111-111111111101', 'https://images.unsplash.com/photo-1576053139778-7e32f2ae3cfd?w=800&auto=format&fit=crop&q=80', TRUE, 1),
    ('p1111111-1111-1111-1111-111111111102', 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=800&auto=format&fit=crop&q=80', TRUE, 1),
    ('p1111111-1111-1111-1111-111111111103', 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80', TRUE, 1),
    
    ('p2222222-2222-2222-2222-222222222201', 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&auto=format&fit=crop&q=80', TRUE, 1),
    ('p2222222-2222-2222-2222-222222222202', 'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&auto=format&fit=crop&q=80', TRUE, 1),
    ('p2222222-2222-2222-2222-222222222203', 'https://images.unsplash.com/photo-1611591475152-4783113f60bc?w=800&auto=format&fit=crop&q=80', TRUE, 1),
    ('p2222222-2222-2222-2222-222222222204', 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&auto=format&fit=crop&q=80', TRUE, 1),

    ('p3333333-3333-3333-3333-333333333301', 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=800&auto=format&fit=crop&q=80', TRUE, 1),
    ('p3333333-3333-3333-3333-333333333302', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&auto=format&fit=crop&q=80', TRUE, 1),
    ('p3333333-3333-3333-3333-333333333303', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80', TRUE, 1),

    ('p4444444-4444-4444-4444-444444444401', 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80', TRUE, 1),
    ('p4444444-4444-4444-4444-444444444402', 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80', TRUE, 1),
    ('p4444444-4444-4444-4444-444444444403', 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&auto=format&fit=crop&q=80', TRUE, 1),

    ('p5555555-5555-5555-5555-555555555501', 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&auto=format&fit=crop&q=80', TRUE, 1),
    ('p5555555-5555-5555-5555-555555555502', 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=800&auto=format&fit=crop&q=80', TRUE, 1),

    ('p6666666-6666-6666-6666-666666666601', 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=800&auto=format&fit=crop&q=80', TRUE, 1),
    ('p6666666-6666-6666-6666-666666666602', 'https://images.unsplash.com/photo-1577741314755-048d8525d31e?w=800&auto=format&fit=crop&q=80', TRUE, 1);

-- Insert Product Variants
INSERT INTO public.product_variants (product_id, name, options, price_modifier, stock_quantity)
VALUES
    ('p1111111-1111-1111-1111-111111111101', 'Color Theme', '["Pastel Dream (Pink, Mauve, Sage)", "Neutral Classic (Black, Beige, Cream)", "Jewel Tone (Emerald, Ruby, Navy)"]'::JSONB, 0, 45),
    ('p1111111-1111-1111-1111-111111111102', 'Color Palette', '["Matte Pastel (Nude, Sage, Blush)", "Monochrome (Black, Tortoise, White)"]'::JSONB, 0, 30),
    ('p1111111-1111-1111-1111-111111111103', 'Frame Color', '["Classic Black", "Vintage Tortoiseshell", "Champagne Gold"]'::JSONB, 0, 18),
    ('p2222222-2222-2222-2222-222222222201', 'Metal Finish', '["18K Gold Plated", "Silver Rhodium Plated"]'::JSONB, 0, 25),
    ('p4444444-4444-4444-4444-444444444401', 'Color', '["Beige Cream", "Sage Green", "Dusty Pink", "Mocha Brown"]'::JSONB, 0, 20),
    ('p4444444-4444-4444-4444-444444444402', 'Pattern', '["Blush Pink Cloud", "Cream Floral Quilted", "Sage Green Grid"]'::JSONB, 0, 28),
    ('p4444444-4444-4444-4444-444444444403', 'Box Color', '["Blush Pink", "Snow White", "Emerald Velvet", "Mocha Nude"]'::JSONB, 0, 16),
    ('p6666666-6666-6666-6666-666666666601', 'Fragrance', '["French Vanilla", "Wild Jasmine & Bergamot", "Warm Sandalwood"]'::JSONB, 0, 24);

-- Insert Starter Discount Coupons
INSERT INTO public.coupons (code, discount_type, discount_value, min_order_amount, is_active)
VALUES
    ('AURA10', 'percentage', 10.00, 1000.00, TRUE),   -- 10% off on Rs. 1000+
    ('WELCOME5', 'percentage', 5.00, 0.00, TRUE),     -- 5% off any order
    ('FREESHIP', 'free_shipping', 199.00, 1500.00, TRUE), -- Free shipping on Rs. 1500+
    ('EIDGIFT', 'fixed', 250.00, 2000.00, TRUE);      -- Flat Rs. 250 off on Rs. 2000+

-- ==============================================================================
-- 7. HOW TO CREATE AN ADMIN USER
-- ==============================================================================
-- 1. Sign up a new user via the store signup page or Supabase Auth Dashboard.
-- 2. Run the following SQL query in the SQL Editor replacing with the admin's email:
--
-- UPDATE public.profiles
-- SET is_admin = TRUE
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@auralifestyle.pk');
--
-- ==============================================================================
