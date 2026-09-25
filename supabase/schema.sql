-- ==============================================================================
-- LaVIDA — Food, Made to Crave
-- Database Architecture & Row Level Security (RLS) Policies
-- PostgreSQL Schema for Supabase
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. ENUMS & TYPES
-- ------------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ------------------------------------------------------------------------------
-- 2. TABLES DEFINITIONS
-- ------------------------------------------------------------------------------

-- Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES public.categories(id) ON DELETE RESTRICT,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    image_url TEXT,
    featured BOOLEAN DEFAULT false NOT NULL,
    available BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Profiles Table (Linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(150),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    avatar_url TEXT,
    role user_role DEFAULT 'customer'::user_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(30) NOT NULL,
    delivery_address TEXT NOT NULL,
    delivery_instructions TEXT,
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    delivery_fee NUMERIC(10, 2) DEFAULT 0.00 NOT NULL CHECK (delivery_fee >= 0),
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    status order_status DEFAULT 'pending'::order_status NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'Cash on Delivery' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(150) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ------------------------------------------------------------------------------
-- 3. INDEXES FOR PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_available ON public.products(available);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(featured);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- ------------------------------------------------------------------------------
-- 4. AUTOMATIC TIMESTAMP TRIGGERS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_products_updated_at ON public.products;
CREATE TRIGGER set_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 5. AUTOMATIC PROFILE CREATION TRIGGER ON AUTH.SIGNUP
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, phone, avatar_url, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer'::user_role)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 6. HELPER FUNCTION: CHECK IF USER IS ADMIN
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'admin'::user_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- CATEGORIES POLICIES
-- Public & customers can view categories
DROP POLICY IF EXISTS "Allow public read access to categories" ON public.categories;
CREATE POLICY "Allow public read access to categories"
    ON public.categories FOR SELECT
    TO anon, authenticated
    USING (true);

-- Only admins can insert, update, or delete categories
DROP POLICY IF EXISTS "Allow admin full access to categories" ON public.categories;
CREATE POLICY "Allow admin full access to categories"
    ON public.categories FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- PRODUCTS POLICIES
-- Public can view available products (or admins can view all)
DROP POLICY IF EXISTS "Allow public read access to available products" ON public.products;
CREATE POLICY "Allow public read access to available products"
    ON public.products FOR SELECT
    TO anon, authenticated
    USING (available = true OR public.is_admin());

-- Only admins can insert, update, or delete products
DROP POLICY IF EXISTS "Allow admin full access to products" ON public.products;
CREATE POLICY "Allow admin full access to products"
    ON public.products FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- PROFILES POLICIES
-- Users can view their own profile; admins can view all profiles
DROP POLICY IF EXISTS "Users can view own profile or admin can view all" ON public.profiles;
CREATE POLICY "Users can view own profile or admin can view all"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id OR public.is_admin());

-- Users can update their own profile (cannot change their own role to admin)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (
        (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
        OR public.is_admin()
    );

-- ORDERS POLICIES
-- Customers can view their own orders; admins can view all orders
DROP POLICY IF EXISTS "Users can view own orders or admin view all" ON public.orders;
CREATE POLICY "Users can view own orders or admin view all"
    ON public.orders FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

-- Authenticated customers can create orders for themselves
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;
CREATE POLICY "Authenticated users can create orders"
    ON public.orders FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Admins can update orders (e.g., status changes)
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders"
    ON public.orders FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ORDER ITEMS POLICIES
-- Users can view order items for their own orders; admins can view all
DROP POLICY IF EXISTS "Users can view items in own orders" ON public.order_items;
CREATE POLICY "Users can view items in own orders"
    ON public.order_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND (orders.user_id = auth.uid() OR public.is_admin())
        )
    );

-- Users can insert order items when creating their order
DROP POLICY IF EXISTS "Users can insert order items" ON public.order_items;
CREATE POLICY "Users can insert order items"
    ON public.order_items FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND (orders.user_id = auth.uid() OR public.is_admin())
        )
    );

-- ------------------------------------------------------------------------------
-- 8. INITIAL SEED DATA (Categories & Products)
-- ------------------------------------------------------------------------------
INSERT INTO public.categories (id, name, description, image_url) VALUES
('c1000000-0000-0000-0000-000000000001', 'Burgers & Sandwiches', 'Gourmet smashed patties, brioche buns, and house sauces.', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80'),
('c1000000-0000-0000-0000-000000000002', 'Artisan Pizzas', 'Wood-fired sourdough crust with San Marzano tomatoes.', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80'),
('c1000000-0000-0000-0000-000000000003', 'Royal Biryani & Bowls', 'Aromatic basmati rice slow-cooked with signature spices.', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80'),
('c1000000-0000-0000-0000-000000000004', 'Crispy Fried Chicken', 'Buttermilk marinated, double-dredged golden crunch.', 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80'),
('c1000000-0000-0000-0000-000000000005', 'Drinks & Mocktails', 'Handcrafted coolers, refreshing teas, and artisan sodas.', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80'),
('c1000000-0000-0000-0000-000000000006', 'Decadent Desserts', 'Warm molten cakes, artisan cheesecakes and gelato.', 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (id, category_id, name, description, price, image_url, featured, available) VALUES
('a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Truffle Umami Smash Burger', 'Double Angus smash patty, truffle aioli, aged cheddar, caramelized onions on toasted brioche.', 12.99, 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80', true, true),
('a1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', 'Spicy Nashville Crisp Burger', 'Crispy buttermilk chicken breast, spicy habanero glaze, house dill pickles, cool slaw.', 11.49, 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=600&auto=format&fit=crop&q=80', true, true),
('a1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000002', 'Burrata Margherita Pizza', 'San Marzano tomato base, fresh cream burrata, sweet basil, cold-pressed olive oil.', 15.99, 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=600&auto=format&fit=crop&q=80', true, true),
('a1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000002', 'Spicy Pepperoni & Hot Honey Pizza', 'Crispy cupping pepperoni, fresh mozzarella, jalapeño slices, drizzled with spicy chili honey.', 16.50, 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&auto=format&fit=crop&q=80', false, true),
('a1000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000003', 'Royal Dum Hyderabadi Biryani', 'Slow cooked tender chicken with saffron-infused basmati rice, fried crisp onions, served with mint raita.', 14.99, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80', true, true),
('a1000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000003', 'Shahi Paneer Tikka Rice Bowl', 'Charcoal-grilled cottage cheese in velvet cashew gravy over fragrant jeera rice.', 13.50, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80', false, true),
('a1000000-0000-0000-0000-000000000007', 'c1000000-0000-0000-0000-000000000004', 'Korean Sticky Garlic Wings (8 pcs)', 'Double-fried crisp wings tossed in sweet soy, garlic glaze, topped with toasted sesame.', 10.99, 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&auto=format&fit=crop&q=80', true, true),
('a1000000-0000-0000-0000-000000000008', 'c1000000-0000-0000-0000-000000000004', 'Golden Crunch Tenders & Fries Basket', '4 hand-breaded chicken breast tenders, seasoned waffle fries, smoky honey mustard.', 9.99, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&auto=format&fit=crop&q=80', false, true),
('a1000000-0000-0000-0000-000000000009', 'c1000000-0000-0000-0000-000000000005', 'Passionfruit Mint Fizz', 'Sparkling soda, fresh passionfruit pulp, crushed mint leaves, lime wedge.', 4.99, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80', false, true),
('a1000000-0000-0000-0000-000000000010', 'c1000000-0000-0000-0000-000000000005', 'Iced Salted Caramel Cold Brew', 'Steeped for 18 hours, rich Arabica coffee topped with house salted caramel foam.', 5.49, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80', false, true),
('a1000000-0000-0000-0000-000000000011', 'c1000000-0000-0000-0000-000000000006', 'Molten Lava Chocolate Cake', 'Warm Belgian dark chocolate cake with flowing fudge center, served with vanilla bean ice cream.', 7.99, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80', true, true),
('a1000000-0000-0000-0000-000000000012', 'c1000000-0000-0000-0000-000000000006', 'New York Berry Cheesecake', 'Classic creamy baked cheesecake with wild strawberry compote and graham cracker crust.', 6.99, 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&auto=format&fit=crop&q=80', false, true)
ON CONFLICT (id) DO NOTHING;
