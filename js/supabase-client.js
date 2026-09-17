/**
 * AURA LIFESTYLE - SUPABASE CLIENT & API SERVICES
 * 
 * Handles all database queries, authentication, storage uploads,
 * cart/wishlist management, and order placement via Supabase.
 * Also includes an intelligent fallback store for zero-config demo mode!
 */

// Global Supabase client instance
let supabaseClient = null;
let isSupabaseConfigured = false;

// Sample fallback store data (matches supabase-schema.sql)
const SEED_CATEGORIES = [
    {
        id: 'c1111111-1111-1111-1111-111111111111',
        name: 'Fashion Accessories',
        slug: 'fashion-accessories',
        image_url: 'https://images.unsplash.com/photo-1576053139778-7e32f2ae3cfd?w=600&auto=format&fit=crop&q=80',
        description: 'Trendy scrunchies, silk scarves, hair clips, claw pins, and stylish sunglasses.',
        display_order: 1
    },
    {
        id: 'c2222222-2222-2222-2222-222222222222',
        name: 'Aesthetic Jewelry',
        slug: 'aesthetic-jewelry',
        image_url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&auto=format&fit=crop&q=80',
        description: 'Minimalist 18k gold-plated necklaces, aesthetic rings, hoop earrings & evil eye bracelets.',
        display_order: 2
    },
    {
        id: 'c3333333-3333-3333-3333-333333333333',
        name: 'Beauty & Skincare Tools',
        slug: 'beauty-tools',
        image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80',
        description: 'Jade rollers, Gua Sha stones, aesthetic makeup brush sets, and beauty blenders.',
        display_order: 3
    },
    {
        id: 'c4444444-4444-4444-4444-444444444444',
        name: 'Bags & Organizers',
        slug: 'bags-organizers',
        image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80',
        description: 'Aesthetic canvas tote bags, quilted travel cosmetic pouches, and jewelry storage boxes.',
        display_order: 4
    },
    {
        id: 'c5555555-5555-5555-5555-555555555555',
        name: 'Cute Stationery & Gifts',
        slug: 'cute-stationery',
        image_url: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=600&auto=format&fit=crop&q=80',
        description: 'Pastel notebooks, cute aesthetic pens, sticker sheets, and thoughtful small gifts.',
        display_order: 5
    },
    {
        id: 'c6666666-6666-6666-6666-666666666666',
        name: 'Home & Lifestyle Decor',
        slug: 'home-decor',
        image_url: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=600&auto=format&fit=crop&q=80',
        description: 'Aesthetic scented soy bubble candles, mini ceramic vases, and aesthetic desk sippers.',
        display_order: 6
    }
];

const SEED_PRODUCTS = [
    {
        id: 'p1111111-1111-1111-1111-111111111101',
        name: 'Silk Satin Scrunchie Set (Pack of 5)',
        slug: 'silk-satin-scrunchie-set-5',
        description: 'Premium soft silk satin hair scrunchies designed to prevent hair breakage and creasing. Comes in a chic pastel palette: Blush Pink, Champagne, Sage Green, Vanilla, and Muted Mauve.',
        category_id: 'c1111111-1111-1111-1111-111111111111',
        price: 650,
        compare_at_price: 950,
        stock_quantity: 45,
        low_stock_threshold: 5,
        is_featured: true,
        is_sale: true,
        is_new: false,
        rating: 4.9,
        reviews_count: 38,
        image_url: 'https://images.unsplash.com/photo-1576053139778-7e32f2ae3cfd?w=800&auto=format&fit=crop&q=80',
        variants: [
            { name: 'Color Theme', options: ['Pastel Dream (Pink, Mauve, Sage)', 'Neutral Classic (Black, Beige, Cream)', 'Jewel Tone (Emerald, Ruby, Navy)'] }
        ]
    },
    {
        id: 'p1111111-1111-1111-1111-111111111102',
        name: 'French Matte Claw Clip Trio',
        slug: 'french-matte-claw-clip-trio',
        description: 'Durable non-slip rectangular claw clips made with eco-friendly acrylic and heavy-duty alloy springs. Perfect for all hair lengths and everyday casual styling.',
        category_id: 'c1111111-1111-1111-1111-111111111111',
        price: 599,
        compare_at_price: 850,
        stock_quantity: 30,
        low_stock_threshold: 5,
        is_featured: true,
        is_sale: false,
        is_new: true,
        rating: 4.8,
        reviews_count: 24,
        image_url: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=800&auto=format&fit=crop&q=80',
        variants: [
            { name: 'Color Palette', options: ['Matte Pastel (Nude, Sage, Blush)', 'Monochrome (Black, Tortoise, White)'] }
        ]
    },
    {
        id: 'p1111111-1111-1111-1111-111111111103',
        name: 'Retro Vintage Oval Sunglasses',
        slug: 'retro-vintage-oval-sunglasses',
        description: 'Timeless 90s aesthetic oval sunglasses with UV400 protective lenses. Lightweight frame offering maximum comfort and instant effortless chic.',
        category_id: 'c1111111-1111-1111-1111-111111111111',
        price: 1199,
        compare_at_price: 1699,
        stock_quantity: 18,
        low_stock_threshold: 4,
        is_featured: false,
        is_sale: true,
        is_new: false,
        rating: 4.7,
        reviews_count: 19,
        image_url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80',
        variants: [
            { name: 'Frame Color', options: ['Classic Black', 'Vintage Tortoiseshell', 'Champagne Gold'] }
        ]
    },
    {
        id: 'p2222222-2222-2222-2222-222222222201',
        name: 'Dainty Gold Pearl Pendant Necklace',
        slug: 'dainty-gold-pearl-pendant-necklace',
        description: '18K gold-plated stainless steel chain with a genuine freshwater baroque mini pearl pendant. Hypoallergenic, tarnish-resistant, and water-friendly for daily wear.',
        category_id: 'c2222222-2222-2222-2222-222222222222',
        price: 1250,
        compare_at_price: 1800,
        stock_quantity: 25,
        low_stock_threshold: 5,
        is_featured: true,
        is_sale: true,
        is_new: false,
        rating: 5.0,
        reviews_count: 52,
        image_url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&auto=format&fit=crop&q=80',
        variants: [
            { name: 'Metal Finish', options: ['18K Gold Plated', 'Silver Rhodium Plated'] }
        ]
    },
    {
        id: 'p2222222-2222-2222-2222-222222222202',
        name: 'Chunky Twisted Croissant Hoop Earrings',
        slug: 'chunky-twisted-croissant-hoops',
        description: 'Bestselling French Parisian style croissant ribbed hoop earrings in 18K gold finish. Extremely lightweight, comfortable for all-day wear without weighing down ears.',
        category_id: 'c2222222-2222-2222-2222-222222222222',
        price: 950,
        compare_at_price: 1400,
        stock_quantity: 35,
        low_stock_threshold: 6,
        is_featured: true,
        is_sale: false,
        is_new: true,
        rating: 4.9,
        reviews_count: 41,
        image_url: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=800&auto=format&fit=crop&q=80',
        variants: [
            { name: 'Size', options: ['Medium (20mm)', 'Large (28mm)'] }
        ]
    },
    {
        id: 'p2222222-2222-2222-2222-222222222203',
        name: 'Celestial Moon & Star Layered Choker',
        slug: 'celestial-moon-star-layered-choker',
        description: 'Two-in-one layered gold chain featuring a delicate crescent moon and cubic zirconia star charms. Adjustable length with lobster clasp.',
        category_id: 'c2222222-2222-2222-2222-222222222222',
        price: 1399,
        compare_at_price: 1999,
        stock_quantity: 12,
        low_stock_threshold: 4,
        is_featured: false,
        is_sale: true,
        is_new: false,
        rating: 4.8,
        reviews_count: 17,
        image_url: 'https://images.unsplash.com/photo-1611591475152-4783113f60bc?w=800&auto=format&fit=crop&q=80',
        variants: []
    },
    {
        id: 'p2222222-2222-2222-2222-222222222204',
        name: 'Minimalist Stacking Rings (Set of 6)',
        slug: 'minimalist-stacking-rings-set-6',
        description: 'Curated set of 6 dainty stacking rings in textured, twisted, and signet designs. Mix and match across fingers for an understated aesthetic look.',
        category_id: 'c2222222-2222-2222-2222-222222222222',
        price: 850,
        compare_at_price: 1200,
        stock_quantity: 22,
        low_stock_threshold: 5,
        is_featured: true,
        is_sale: false,
        is_new: true,
        rating: 4.6,
        reviews_count: 29,
        image_url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&auto=format&fit=crop&q=80',
        variants: [
            { name: 'Ring Size Range', options: ['US 6-7 (Standard)', 'US 7-8 (Medium)'] }
        ]
    },
    {
        id: 'p3333333-3333-3333-3333-333333333301',
        name: 'Natural Rose Quartz Gua Sha & Roller Duo',
        slug: 'rose-quartz-gua-sha-roller-duo',
        description: 'Handcrafted 100% authentic Brazilian rose quartz facial roller and heart-shaped Gua Sha stone. Helps reduce facial puffiness, boost lymphatic drainage, and enhance serum absorption.',
        category_id: 'c3333333-3333-3333-3333-333333333333',
        price: 1499,
        compare_at_price: 2200,
        stock_quantity: 15,
        low_stock_threshold: 3,
        is_featured: true,
        is_sale: true,
        is_new: false,
        rating: 4.9,
        reviews_count: 46,
        image_url: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=800&auto=format&fit=crop&q=80',
        variants: [
            { name: 'Stone Type', options: ['Natural Rose Quartz', 'Jade Green Nephrite', 'Black Obsidian'] }
        ]
    },
    {
        id: 'p3333333-3333-3333-3333-333333333302',
        name: 'Velvet Cloud Makeup Sponge Trio with Case',
        slug: 'velvet-cloud-makeup-sponge-trio',
        description: 'Ultra-soft microfiber blender sponges that double in size when damp. Delivers an airbrushed, streak-free foundation and concealer finish with minimal product absorption.',
        category_id: 'c3333333-3333-3333-3333-333333333333',
        price: 750,
        compare_at_price: 1100,
        stock_quantity: 40,
        low_stock_threshold: 8,
        is_featured: false,
        is_sale: false,
        is_new: true,
        rating: 4.7,
        reviews_count: 33,
        image_url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&auto=format&fit=crop&q=80',
        variants: [
            { name: 'Color Theme', options: ['Marshmallow Pink & Lilac', 'Mocha & Nude Cream', 'Matcha Green'] }
        ]
    },
    {
        id: 'p3333333-3333-3333-3333-333333333303',
        name: 'Travel Makeup Brush Set with Leather Case (8 Pcs)',
        slug: 'travel-makeup-brush-set-8-pcs',
        description: 'Compact set of 8 ultra-soft vegan synthetic makeup brushes with champagne gold ferrules, packaged in a travel-ready cylindrical magnetic case.',
        category_id: 'c3333333-3333-3333-3333-333333333333',
        price: 1850,
        compare_at_price: 2500,
        stock_quantity: 14,
        low_stock_threshold: 4,
        is_featured: true,
        is_sale: false,
        is_new: false,
        rating: 4.9,
        reviews_count: 21,
        image_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
        variants: [
            { name: 'Case Color', options: ['Blush Pink Leather', 'Champagne Gold', 'Matte Sage'] }
        ]
    },
    {
        id: 'p4444444-4444-4444-4444-444444444401',
        name: 'Aesthetic Corduroy Shoulder Tote Bag',
        slug: 'aesthetic-corduroy-tote-bag',
        description: 'Spacious soft corduroy tote bag with magnetic snap closure and interior zip pocket. Fits a 13-inch laptop, planner, water bottle, and daily makeup essentials.',
        category_id: 'c4444444-4444-4444-4444-444444444444',
        price: 1650,
        compare_at_price: 2250,
        stock_quantity: 20,
        low_stock_threshold: 5,
        is_featured: true,
        is_sale: true,
        is_new: false,
        rating: 4.8,
        reviews_count: 35,
        image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&auto=format&fit=crop&q=80',
        variants: [
            { name: 'Color', options: ['Beige Cream', 'Sage Green', 'Dusty Pink', 'Mocha Brown'] }
        ]
    },
    {
        id: 'p4444444-4444-4444-4444-444444444402',
        name: 'Quilted Puffer Cosmetic Pouch',
        slug: 'quilted-puffer-cosmetic-pouch',
        description: 'Cloud-soft quilted travel pouch with smooth gold zipper. Water-resistant lining inside, ideal for carrying everyday makeup, lip glosses, and skincare bottles.',
        category_id: 'c4444444-4444-4444-4444-444444444444',
        price: 899,
        compare_at_price: 1300,
        stock_quantity: 28,
        low_stock_threshold: 5,
        is_featured: false,
        is_sale: false,
        is_new: true,
        rating: 4.7,
        reviews_count: 18,
        image_url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80',
        variants: [
            { name: 'Pattern', options: ['Blush Pink Cloud', 'Cream Floral Quilted', 'Sage Green Grid'] }
        ]
    },
    {
        id: 'p4444444-4444-4444-4444-444444444403',
        name: 'Portable Travel Jewelry Box Organizer',
        slug: 'portable-travel-jewelry-box-organizer',
        description: 'Luxurious PU leather compact jewelry case with soft velvet interior. Compartments for rings, necklaces, stud earrings, and bracelets with zip-around protection.',
        category_id: 'c4444444-4444-4444-4444-444444444444',
        price: 1299,
        compare_at_price: 1899,
        stock_quantity: 16,
        low_stock_threshold: 4,
        is_featured: true,
        is_sale: false,
        is_new: false,
        rating: 5.0,
        reviews_count: 42,
        image_url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&auto=format&fit=crop&q=80',
        variants: [
            { name: 'Box Color', options: ['Blush Pink', 'Snow White', 'Emerald Velvet', 'Mocha Nude'] }
        ]
    },
    {
        id: 'p5555555-5555-5555-5555-555555555501',
        name: 'Aesthetic Hardcover Bullet Journal & Pen',
        slug: 'aesthetic-hardcover-bullet-journal-pen',
        description: '160 GSM thick bleed-proof dotted pages with a ribbon bookmark, expandable inner pocket, and gold metallic matching gel pen. Perfect for journaling and study notes.',
        category_id: 'c5555555-5555-5555-5555-555555555555',
        price: 999,
        compare_at_price: 1450,
        stock_quantity: 32,
        low_stock_threshold: 6,
        is_featured: false,
        is_sale: true,
        is_new: true,
        rating: 4.8,
        reviews_count: 27,
        image_url: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&auto=format&fit=crop&q=80',
        variants: [
            { name: 'Cover Color', options: ['Pastel Sage', 'Lavender Mist', 'Champagne Nude'] }
        ]
    },
    {
        id: 'p5555555-5555-5555-5555-555555555502',
        name: 'Pastel Aesthetic Highlighter Set (6 Colors)',
        slug: 'pastel-aesthetic-highlighter-set-6',
        description: 'Soft mild-liner highlighters with dual chisel tips. No bleed-through on standard book pages. Ideal for study aesthetics, bullet journaling, and gift packages.',
        category_id: 'c5555555-5555-5555-5555-555555555555',
        price: 550,
        compare_at_price: 799,
        stock_quantity: 50,
        low_stock_threshold: 10,
        is_featured: false,
        is_sale: false,
        is_new: true,
        rating: 4.9,
        reviews_count: 39,
        image_url: 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=800&auto=format&fit=crop&q=80',
        variants: []
    },
    {
        id: 'p6666666-6666-6666-6666-666666666601',
        name: 'French Vanilla Scented Soy Bubble Candle',
        slug: 'french-vanilla-soy-bubble-candle',
        description: 'Hand-poured 100% natural soy wax bubble cube candle scented with warm French vanilla and Madagascar amber. Clean-burning and serves as an aesthetic room decor accent.',
        category_id: 'c6666666-6666-6666-6666-666666666666',
        price: 850,
        compare_at_price: 1250,
        stock_quantity: 24,
        low_stock_threshold: 4,
        is_featured: true,
        is_sale: true,
        is_new: false,
        rating: 4.9,
        reviews_count: 53,
        image_url: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=800&auto=format&fit=crop&q=80',
        variants: [
            { name: 'Fragrance', options: ['French Vanilla', 'Wild Jasmine & Bergamot', 'Warm Sandalwood'] }
        ]
    },
    {
        id: 'p6666666-6666-6666-6666-666666666602',
        name: 'Glass Aesthetic Tumbler with Glass Straw (500ml)',
        slug: 'glass-aesthetic-tumbler-straw-500ml',
        description: 'Borosilicate clear glass iced coffee can tumbler with natural bamboo lid and reusable curved glass straw. Heat and cold resistant for iced coffees, boba, and matcha lattes.',
        category_id: 'c6666666-6666-6666-6666-666666666666',
        price: 1150,
        compare_at_price: 1600,
        stock_quantity: 19,
        low_stock_threshold: 4,
        is_featured: true,
        is_sale: false,
        is_new: true,
        rating: 4.9,
        reviews_count: 44,
        image_url: 'https://images.unsplash.com/photo-1577741314755-048d8525d31e?w=800&auto=format&fit=crop&q=80',
        variants: [
            { name: 'Print', options: ['Minimalist Daisy Pattern', 'Clear Glass Minimalist', 'Smile Aesthetic Typography'] }
        ]
    }
];

const SEED_COUPONS = [
    { code: 'AURA10', discount_type: 'percentage', discount_value: 10, min_order_amount: 1000, is_active: true },
    { code: 'WELCOME5', discount_type: 'percentage', discount_value: 5, min_order_amount: 0, is_active: true },
    { code: 'FREESHIP', discount_type: 'free_shipping', discount_value: 199, min_order_amount: 1500, is_active: true },
    { code: 'EIDGIFT', discount_type: 'fixed', discount_value: 250, min_order_amount: 2000, is_active: true }
];

// LocalStorage Mock DB Helpers for seamless offline/standalone testing
class LocalStoreManager {
    static init() {
        if (!localStorage.getItem('aura_categories')) {
            localStorage.setItem('aura_categories', JSON.stringify(SEED_CATEGORIES));
        }
        if (!localStorage.getItem('aura_products')) {
            localStorage.setItem('aura_products', JSON.stringify(SEED_PRODUCTS));
        }
        if (!localStorage.getItem('aura_coupons')) {
            localStorage.setItem('aura_coupons', JSON.stringify(SEED_COUPONS));
        }
        if (!localStorage.getItem('aura_orders')) {
            localStorage.setItem('aura_orders', JSON.stringify([]));
        }
        if (!localStorage.getItem('aura_wishlist')) {
            localStorage.setItem('aura_wishlist', JSON.stringify([]));
        }
        if (!localStorage.getItem('aura_cart')) {
            localStorage.setItem('aura_cart', JSON.stringify([]));
        }
    }

    static get(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch (e) {
            return [];
        }
    }

    static set(key, val) {
        localStorage.setItem(key, JSON.stringify(val));
    }
}

LocalStoreManager.init();

/**
 * Initialize Supabase Client
 */
function initSupabase() {
    try {
        const url = CONFIG.SUPABASE_URL;
        const key = CONFIG.SUPABASE_ANON_KEY;

        const isRealKey = url && key &&
            url !== 'https://your-project.supabase.co' &&
            !url.includes('your-project') &&
            key !== 'your-anon-key-here' &&
            key.length > 20;

        if (isRealKey && window.supabase) {
            supabaseClient = window.supabase.createClient(url, key, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true
                }
            });
            isSupabaseConfigured = true;
            console.log('✅ Supabase Client Connected Successfully:', url);
        } else {
            console.info('ℹ️ Running in Local Storage Demo Mode. To connect live Supabase, update js/config.js with your project credentials.');
            isSupabaseConfigured = false;
        }
    } catch (err) {
        console.warn('⚠️ Supabase init error:', err);
        isSupabaseConfigured = false;
    }
}

// Auto-run init
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        initSupabase();
    });
}

// ==============================================================================
// AUTHENTICATION SERVICE
// ==============================================================================
const AuthService = {
    async signUp(email, password, fullName, phone, address, city) {
        if (isSupabaseConfigured && supabaseClient) {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        phone: phone,
                        address: address,
                        city: city || 'Karachi',
                        is_admin: false
                    }
                }
            });
            if (error) throw error;
            return data;
        } else {
            // Local Mock Auth
            const users = LocalStoreManager.get('aura_users');
            if (users.find(u => u.email === email)) {
                throw new Error('An account with this email already exists.');
            }
            const newUser = {
                id: 'usr_' + Date.now(),
                email,
                password,
                user_metadata: {
                    full_name: fullName,
                    phone: phone,
                    address: address,
                    city: city || 'Karachi',
                    is_admin: email.toLowerCase().includes('admin') // auto-grant admin if email has admin
                }
            };
            users.push(newUser);
            LocalStoreManager.set('aura_users', users);
            LocalStoreManager.set('aura_session_user', newUser);
            return { user: newUser, session: { user: newUser } };
        }
    },

    async signIn(email, password) {
        if (isSupabaseConfigured && supabaseClient) {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            return data;
        } else {
            // Local Mock SignIn
            const users = LocalStoreManager.get('aura_users');
            const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
            
            // Allow default admin account in mock mode
            if (!found && email === 'admin@auralifestyle.pk' && password === 'admin123') {
                const defaultAdmin = {
                    id: 'usr_admin_default',
                    email: 'admin@auralifestyle.pk',
                    user_metadata: {
                        full_name: 'Store Administrator',
                        phone: '03001234567',
                        address: 'DHA Phase 6, Karachi',
                        city: 'Karachi',
                        is_admin: true
                    }
                };
                LocalStoreManager.set('aura_session_user', defaultAdmin);
                return { user: defaultAdmin, session: { user: defaultAdmin } };
            }

            if (!found || found.password !== password) {
                throw new Error('Invalid email or password.');
            }
            LocalStoreManager.set('aura_session_user', found);
            return { user: found, session: { user: found } };
        }
    },

    async signOut() {
        if (isSupabaseConfigured && supabaseClient) {
            const { error } = await supabaseClient.auth.signOut();
            if (error) throw error;
        }
        LocalStoreManager.set('aura_session_user', null);
        return true;
    },

    async getCurrentUser() {
        if (isSupabaseConfigured && supabaseClient) {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (!user) return null;
            // Fetch profile
            const { data: profile } = await supabaseClient
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            
            return {
                ...user,
                profile: profile || {
                    full_name: user.user_metadata?.full_name || 'Customer',
                    phone: user.user_metadata?.phone || '',
                    address: user.user_metadata?.address || '',
                    city: user.user_metadata?.city || 'Karachi',
                    is_admin: user.user_metadata?.is_admin || false
                }
            };
        } else {
            const user = LocalStoreManager.get('aura_session_user');
            if (!user || !user.id) return null;
            return {
                ...user,
                profile: {
                    id: user.id,
                    full_name: user.user_metadata?.full_name || 'Customer',
                    phone: user.user_metadata?.phone || '',
                    address: user.user_metadata?.address || '',
                    city: user.user_metadata?.city || 'Karachi',
                    is_admin: !!user.user_metadata?.is_admin
                }
            };
        }
    },

    async updateProfile(userId, updates) {
        if (isSupabaseConfigured && supabaseClient) {
            const { data, error } = await supabaseClient
                .from('profiles')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            const user = LocalStoreManager.get('aura_session_user');
            if (user) {
                user.user_metadata = { ...user.user_metadata, ...updates };
                LocalStoreManager.set('aura_session_user', user);
                // Also update in users list
                const users = LocalStoreManager.get('aura_users');
                const idx = users.findIndex(u => u.id === user.id);
                if (idx !== -1) {
                    users[idx].user_metadata = user.user_metadata;
                    LocalStoreManager.set('aura_users', users);
                }
                return user.user_metadata;
            }
            return updates;
        }
    },

    async isCurrentUserAdmin() {
        const user = await this.getCurrentUser();
        return !!(user && user.profile && user.profile.is_admin);
    }
};

// ==============================================================================
// PRODUCT & CATEGORY SERVICE
// ==============================================================================
const ProductService = {
    async getCategories() {
        if (isSupabaseConfigured && supabaseClient) {
            const { data, error } = await supabaseClient
                .from('categories')
                .select('*')
                .order('display_order', { ascending: true });
            if (error) throw error;
            return data && data.length > 0 ? data : SEED_CATEGORIES;
        } else {
            return LocalStoreManager.get('aura_categories');
        }
    },

    async getProducts(filters = {}) {
        const {
            categoryId = null,
            search = '',
            minPrice = 0,
            maxPrice = Infinity,
            isFeatured = null,
            isSale = null,
            isNew = null,
            inStockOnly = false,
            sortBy = 'newest'
        } = filters;

        if (isSupabaseConfigured && supabaseClient) {
            let query = supabaseClient
                .from('products')
                .select(`
                    *,
                    category:categories(id, name, slug),
                    images:product_images(id, image_url, is_primary, display_order),
                    variants:product_variants(id, name, options, price_modifier, stock_quantity)
                `);

            if (categoryId) query = query.eq('category_id', categoryId);
            if (isFeatured !== null) query = query.eq('is_featured', isFeatured);
            if (isSale !== null) query = query.eq('is_sale', isSale);
            if (isNew !== null) query = query.eq('is_new', isNew);
            if (inStockOnly) query = query.gt('stock_quantity', 0);
            if (minPrice > 0) query = query.gte('price', minPrice);
            if (maxPrice < Infinity && maxPrice > 0) query = query.lte('price', maxPrice);

            if (search) {
                query = query.ilike('name', `%${search}%`);
            }

            // Sorting
            switch (sortBy) {
                case 'price-asc':
                    query = query.order('price', { ascending: true });
                    break;
                case 'price-desc':
                    query = query.order('price', { ascending: false });
                    break;
                case 'rating':
                    query = query.order('rating', { ascending: false });
                    break;
                case 'name':
                    query = query.order('name', { ascending: true });
                    break;
                case 'newest':
                default:
                    query = query.order('created_at', { ascending: false });
                    break;
            }

            const { data, error } = await query;
            if (error) {
                console.error('Error fetching Supabase products:', error);
                return this.getMockFilteredProducts(filters);
            }

            // Format image_url fallback if stored in product_images
            return data.map(p => {
                const primaryImg = p.images && p.images.find(img => img.is_primary);
                const firstImg = p.images && p.images[0];
                return {
                    ...p,
                    image_url: primaryImg ? primaryImg.image_url : (firstImg ? firstImg.image_url : (p.image_url || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80'))
                };
            });
        } else {
            return this.getMockFilteredProducts(filters);
        }
    },

    getMockFilteredProducts(filters) {
        let products = LocalStoreManager.get('aura_products');
        const categories = LocalStoreManager.get('aura_categories');

        // Attach category object
        products = products.map(p => ({
            ...p,
            category: categories.find(c => c.id === p.category_id) || { name: 'Accessories' }
        }));

        const {
            categoryId,
            search,
            minPrice,
            maxPrice,
            isFeatured,
            isSale,
            isNew,
            inStockOnly,
            sortBy
        } = filters;

        if (categoryId) {
            products = products.filter(p => p.category_id === categoryId);
        }
        if (search) {
            const q = search.toLowerCase();
            products = products.filter(p => 
                p.name.toLowerCase().includes(q) || 
                p.description.toLowerCase().includes(q) ||
                (p.category && p.category.name.toLowerCase().includes(q))
            );
        }
        if (isFeatured !== null && isFeatured !== undefined) {
            products = products.filter(p => !!p.is_featured === !!isFeatured);
        }
        if (isSale !== null && isSale !== undefined) {
            products = products.filter(p => !!p.is_sale === !!isSale);
        }
        if (isNew !== null && isNew !== undefined) {
            products = products.filter(p => !!p.is_new === !!isNew);
        }
        if (inStockOnly) {
            products = products.filter(p => p.stock_quantity > 0);
        }
        if (minPrice) {
            products = products.filter(p => p.price >= minPrice);
        }
        if (maxPrice && maxPrice < Infinity) {
            products = products.filter(p => p.price <= maxPrice);
        }

        // Sorting
        switch (sortBy) {
            case 'price-asc':
                products.sort((a, b) => a.price - b.price);
                break;
            case 'price-desc':
                products.sort((a, b) => b.price - a.price);
                break;
            case 'rating':
                products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                break;
            case 'name':
                products.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'newest':
            default:
                // keep current order or sort by date if available
                break;
        }

        return products;
    },

    async getProductById(id) {
        if (isSupabaseConfigured && supabaseClient) {
            const { data, error } = await supabaseClient
                .from('products')
                .select(`
                    *,
                    category:categories(id, name, slug),
                    images:product_images(id, image_url, is_primary, display_order),
                    variants:product_variants(id, name, options, price_modifier, stock_quantity)
                `)
                .eq('id', id)
                .single();
            if (error) throw error;
            return data;
        } else {
            const products = LocalStoreManager.get('aura_products');
            const categories = LocalStoreManager.get('aura_categories');
            const product = products.find(p => p.id === id);
            if (!product) return null;
            return {
                ...product,
                category: categories.find(c => c.id === product.category_id)
            };
        }
    },

    // Admin: Create product
    async createProduct(productData, images = [], variants = []) {
        if (isSupabaseConfigured && supabaseClient) {
            // 1. Insert product
            const slug = productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
            const { data: newProd, error: prodErr } = await supabaseClient
                .from('products')
                .insert([{
                    name: productData.name,
                    slug: slug,
                    description: productData.description,
                    category_id: productData.category_id,
                    price: Number(productData.price),
                    compare_at_price: productData.compare_at_price ? Number(productData.compare_at_price) : null,
                    stock_quantity: Number(productData.stock_quantity || 0),
                    is_featured: !!productData.is_featured,
                    is_sale: !!productData.is_sale,
                    is_new: !!productData.is_new,
                    rating: 5.0,
                    reviews_count: 0
                }])
                .select()
                .single();

            if (prodErr) throw prodErr;

            // 2. Insert Images
            if (images && images.length > 0) {
                const imgRows = images.map((url, idx) => ({
                    product_id: newProd.id,
                    image_url: url,
                    is_primary: idx === 0,
                    display_order: idx + 1
                }));
                await supabaseClient.from('product_images').insert(imgRows);
            }

            // 3. Insert Variants
            if (variants && variants.length > 0) {
                const varRows = variants.map(v => ({
                    product_id: newProd.id,
                    name: v.name,
                    options: v.options,
                    price_modifier: v.price_modifier || 0,
                    stock_quantity: v.stock_quantity || newProd.stock_quantity
                }));
                await supabaseClient.from('product_variants').insert(varRows);
            }

            return newProd;
        } else {
            // Mock Create
            const products = LocalStoreManager.get('aura_products');
            const newId = 'p_' + Date.now();
            const slug = productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
            const newProduct = {
                id: newId,
                name: productData.name,
                slug: slug,
                description: productData.description,
                category_id: productData.category_id,
                price: Number(productData.price),
                compare_at_price: productData.compare_at_price ? Number(productData.compare_at_price) : null,
                stock_quantity: Number(productData.stock_quantity || 0),
                is_featured: !!productData.is_featured,
                is_sale: !!productData.is_sale,
                is_new: !!productData.is_new,
                rating: 5.0,
                reviews_count: 0,
                image_url: images[0] || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80',
                variants: variants
            };
            products.unshift(newProduct);
            LocalStoreManager.set('aura_products', products);
            return newProduct;
        }
    },

    // Admin: Update product
    async updateProduct(id, updates, images = [], variants = []) {
        if (isSupabaseConfigured && supabaseClient) {
            const { data, error } = await supabaseClient
                .from('products')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;

            if (images && images.length > 0) {
                // Delete old images & insert new
                await supabaseClient.from('product_images').delete().eq('product_id', id);
                const imgRows = images.map((url, idx) => ({
                    product_id: id,
                    image_url: url,
                    is_primary: idx === 0,
                    display_order: idx + 1
                }));
                await supabaseClient.from('product_images').insert(imgRows);
            }

            return data;
        } else {
            const products = LocalStoreManager.get('aura_products');
            const idx = products.findIndex(p => p.id === id);
            if (idx === -1) throw new Error('Product not found');
            products[idx] = {
                ...products[idx],
                ...updates,
                image_url: images[0] || products[idx].image_url,
                variants: variants.length ? variants : products[idx].variants
            };
            LocalStoreManager.set('aura_products', products);
            return products[idx];
        }
    },

    // Admin: Delete product
    async deleteProduct(id) {
        if (isSupabaseConfigured && supabaseClient) {
            const { error } = await supabaseClient
                .from('products')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return true;
        } else {
            let products = LocalStoreManager.get('aura_products');
            products = products.filter(p => p.id !== id);
            LocalStoreManager.set('aura_products', products);
            return true;
        }
    },

    // Admin: Category operations
    async createCategory(categoryData) {
        const slug = categoryData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        if (isSupabaseConfigured && supabaseClient) {
            const { data, error } = await supabaseClient
                .from('categories')
                .insert([{
                    name: categoryData.name,
                    slug: slug,
                    description: categoryData.description,
                    image_url: categoryData.image_url,
                    display_order: categoryData.display_order || 1
                }])
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            const categories = LocalStoreManager.get('aura_categories');
            const newCat = {
                id: 'c_' + Date.now(),
                name: categoryData.name,
                slug: slug,
                description: categoryData.description,
                image_url: categoryData.image_url,
                display_order: categories.length + 1
            };
            categories.push(newCat);
            LocalStoreManager.set('aura_categories', categories);
            return newCat;
        }
    },

    async updateCategory(id, updates) {
        if (isSupabaseConfigured && supabaseClient) {
            const { data, error } = await supabaseClient
                .from('categories')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            const categories = LocalStoreManager.get('aura_categories');
            const idx = categories.findIndex(c => c.id === id);
            if (idx !== -1) {
                categories[idx] = { ...categories[idx], ...updates };
                LocalStoreManager.set('aura_categories', categories);
                return categories[idx];
            }
            return null;
        }
    },

    async deleteCategory(id) {
        if (isSupabaseConfigured && supabaseClient) {
            const { error } = await supabaseClient
                .from('categories')
                .delete()
                .eq('id', id);
            if (error) throw error;
            return true;
        } else {
            let categories = LocalStoreManager.get('aura_categories');
            categories = categories.filter(c => c.id !== id);
            LocalStoreManager.set('aura_categories', categories);
            return true;
        }
    }
};

// ==============================================================================
// STORAGE SERVICE (Product Image Uploads)
// ==============================================================================
const StorageService = {
    async uploadProductImage(file) {
        if (isSupabaseConfigured && supabaseClient) {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
            const filePath = `products/${fileName}`;

            const { data, error } = await supabaseClient.storage
                .from(CONFIG.STORAGE_BUCKET)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            const { data: urlData } = supabaseClient.storage
                .from(CONFIG.STORAGE_BUCKET)
                .getPublicUrl(filePath);

            return urlData.publicUrl;
        } else {
            // In demo mode without storage bucket, read file as base64 data URL
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(e);
                reader.readAsDataURL(file);
            });
        }
    }
};

// ==============================================================================
// CART SERVICE
// ==============================================================================
const CartService = {
    async getCart() {
        const user = await AuthService.getCurrentUser();
        if (isSupabaseConfigured && supabaseClient && user) {
            const { data, error } = await supabaseClient
                .from('cart_items')
                .select(`
                    id,
                    quantity,
                    selected_variant_name,
                    product:products(id, name, slug, price, compare_at_price, stock_quantity, image_url)
                `)
                .eq('user_id', user.id);
            if (error) {
                console.error('Error fetching Supabase cart:', error);
                return LocalStoreManager.get('aura_cart');
            }
            return data.map(item => ({
                id: item.id,
                productId: item.product.id,
                name: item.product.name,
                price: item.product.price,
                compare_at_price: item.product.compare_at_price,
                image_url: item.product.image_url,
                variantName: item.selected_variant_name,
                quantity: item.quantity,
                stock: item.product.stock_quantity
            }));
        } else {
            return LocalStoreManager.get('aura_cart');
        }
    },

    async addToCart(product, quantity = 1, variantName = '') {
        const user = await AuthService.getCurrentUser();
        if (isSupabaseConfigured && supabaseClient && user) {
            // Check if already in cart
            const { data: existing } = await supabaseClient
                .from('cart_items')
                .select('id, quantity')
                .eq('user_id', user.id)
                .eq('product_id', product.id)
                .eq('selected_variant_name', variantName || '')
                .single();

            if (existing) {
                const { data, error } = await supabaseClient
                    .from('cart_items')
                    .update({
                        quantity: existing.quantity + quantity,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);
                if (error) throw error;
            } else {
                const { data, error } = await supabaseClient
                    .from('cart_items')
                    .insert([{
                        user_id: user.id,
                        product_id: product.id,
                        selected_variant_name: variantName || '',
                        quantity: quantity
                    }]);
                if (error) throw error;
            }
            return true;
        } else {
            // Guest local cart
            const cart = LocalStoreManager.get('aura_cart');
            const existingIndex = cart.findIndex(item => 
                item.productId === product.id && 
                (item.variantName || '') === (variantName || '')
            );

            if (existingIndex !== -1) {
                cart[existingIndex].quantity += quantity;
            } else {
                cart.push({
                    id: 'cart_' + Date.now(),
                    productId: product.id,
                    name: product.name,
                    price: product.price,
                    compare_at_price: product.compare_at_price,
                    image_url: product.image_url,
                    variantName: variantName || '',
                    quantity: quantity,
                    stock: product.stock_quantity
                });
            }
            LocalStoreManager.set('aura_cart', cart);
            return true;
        }
    },

    async updateQuantity(cartItemId, newQuantity) {
        if (newQuantity <= 0) return this.removeFromCart(cartItemId);
        const user = await AuthService.getCurrentUser();

        if (isSupabaseConfigured && supabaseClient && user) {
            const { error } = await supabaseClient
                .from('cart_items')
                .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
                .eq('id', cartItemId)
                .eq('user_id', user.id);
            if (error) throw error;
            return true;
        } else {
            const cart = LocalStoreManager.get('aura_cart');
            const item = cart.find(i => i.id === cartItemId || i.productId === cartItemId);
            if (item) {
                item.quantity = newQuantity;
                LocalStoreManager.set('aura_cart', cart);
            }
            return true;
        }
    },

    async removeFromCart(cartItemId) {
        const user = await AuthService.getCurrentUser();
        if (isSupabaseConfigured && supabaseClient && user) {
            const { error } = await supabaseClient
                .from('cart_items')
                .delete()
                .eq('id', cartItemId)
                .eq('user_id', user.id);
            if (error) throw error;
            return true;
        } else {
            let cart = LocalStoreManager.get('aura_cart');
            cart = cart.filter(i => i.id !== cartItemId && i.productId !== cartItemId);
            LocalStoreManager.set('aura_cart', cart);
            return true;
        }
    },

    async clearCart() {
        const user = await AuthService.getCurrentUser();
        if (isSupabaseConfigured && supabaseClient && user) {
            await supabaseClient.from('cart_items').delete().eq('user_id', user.id);
        }
        LocalStoreManager.set('aura_cart', []);
        return true;
    }
};

// ==============================================================================
// WISHLIST SERVICE
// ==============================================================================
const WishlistService = {
    async getWishlist() {
        const user = await AuthService.getCurrentUser();
        if (isSupabaseConfigured && supabaseClient && user) {
            const { data, error } = await supabaseClient
                .from('wishlist_items')
                .select(`
                    id,
                    product:products(id, name, slug, price, compare_at_price, stock_quantity, image_url, category:categories(name))
                `)
                .eq('user_id', user.id);
            if (error) {
                console.error('Error fetching Supabase wishlist:', error);
                return LocalStoreManager.get('aura_wishlist');
            }
            return data.map(w => ({
                id: w.id,
                productId: w.product.id,
                name: w.product.name,
                price: w.product.price,
                compare_at_price: w.product.compare_at_price,
                image_url: w.product.image_url,
                categoryName: w.product.category?.name || 'Lifestyle',
                stock: w.product.stock_quantity
            }));
        } else {
            return LocalStoreManager.get('aura_wishlist');
        }
    },

    async toggleWishlist(product) {
        const user = await AuthService.getCurrentUser();
        if (isSupabaseConfigured && supabaseClient && user) {
            const { data: existing } = await supabaseClient
                .from('wishlist_items')
                .select('id')
                .eq('user_id', user.id)
                .eq('product_id', product.id)
                .single();

            if (existing) {
                await supabaseClient.from('wishlist_items').delete().eq('id', existing.id);
                return { added: false };
            } else {
                await supabaseClient.from('wishlist_items').insert([{
                    user_id: user.id,
                    product_id: product.id
                }]);
                return { added: true };
            }
        } else {
            let wishlist = LocalStoreManager.get('aura_wishlist');
            const idx = wishlist.findIndex(item => item.productId === product.id);
            if (idx !== -1) {
                wishlist.splice(idx, 1);
                LocalStoreManager.set('aura_wishlist', wishlist);
                return { added: false };
            } else {
                wishlist.push({
                    id: 'wish_' + Date.now(),
                    productId: product.id,
                    name: product.name,
                    price: product.price,
                    compare_at_price: product.compare_at_price,
                    image_url: product.image_url,
                    categoryName: product.category?.name || 'Lifestyle',
                    stock: product.stock_quantity
                });
                LocalStoreManager.set('aura_wishlist', wishlist);
                return { added: true };
            }
        }
    },

    async isInWishlist(productId) {
        const wishlist = await this.getWishlist();
        return wishlist.some(item => item.productId === productId);
    }
};

// ==============================================================================
// ORDER SERVICE
// ==============================================================================
const OrderService = {
    async createOrder(orderPayload) {
        const {
            customerName,
            customerEmail,
            customerPhone,
            shippingAddress,
            city,
            landmark = '',
            paymentMethod = 'cod',
            subtotal,
            shippingFee,
            discount,
            totalAmount,
            couponCode = '',
            notes = '',
            items = []
        } = orderPayload;

        const orderNumber = generateOrderNumber();
        const user = await AuthService.getCurrentUser();
        const userId = user ? user.id : null;

        if (isSupabaseConfigured && supabaseClient) {
            // 1. Insert order
            const { data: order, error: orderErr } = await supabaseClient
                .from('orders')
                .insert([{
                    order_number: orderNumber,
                    user_id: userId,
                    customer_name: customerName,
                    customer_email: customerEmail,
                    customer_phone: customerPhone,
                    shipping_address: shippingAddress,
                    city: city,
                    landmark: landmark,
                    payment_method: paymentMethod,
                    payment_status: paymentMethod === 'cod' ? 'unpaid' : 'unpaid',
                    order_status: 'pending',
                    subtotal: Number(subtotal),
                    shipping_fee: Number(shippingFee),
                    discount: Number(discount || 0),
                    total_amount: Number(totalAmount),
                    coupon_code: couponCode,
                    notes: notes
                }])
                .select()
                .single();

            if (orderErr) throw orderErr;

            // 2. Insert order items
            if (items.length > 0) {
                const itemRows = items.map(item => ({
                    order_id: order.id,
                    product_id: item.productId,
                    product_name: item.name,
                    variant_title: item.variantName || '',
                    price: Number(item.price),
                    quantity: Number(item.quantity),
                    total_price: Number(item.price) * Number(item.quantity),
                    image_url: item.image_url
                }));

                const { error: itemsErr } = await supabaseClient
                    .from('order_items')
                    .insert(itemRows);

                if (itemsErr) console.error('Error inserting order items:', itemsErr);
            }

            // Clear Cart
            await CartService.clearCart();
            return order;
        } else {
            // Mock Order
            const newOrder = {
                id: 'ord_' + Date.now(),
                order_number: orderNumber,
                user_id: userId,
                customer_name: customerName,
                customer_email: customerEmail,
                customer_phone: customerPhone,
                shipping_address: shippingAddress,
                city: city,
                landmark: landmark,
                payment_method: paymentMethod,
                payment_status: 'unpaid',
                order_status: 'pending',
                courier_name: 'TCS Express',
                tracking_number: 'PK' + Math.floor(100000000 + Math.random() * 900000000),
                subtotal: Number(subtotal),
                shipping_fee: Number(shippingFee),
                discount: Number(discount || 0),
                total_amount: Number(totalAmount),
                coupon_code: couponCode,
                notes: notes,
                items: items,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const orders = LocalStoreManager.get('aura_orders');
            orders.unshift(newOrder);
            LocalStoreManager.set('aura_orders', orders);

            // Deduct stock in mock products
            const products = LocalStoreManager.get('aura_products');
            items.forEach(item => {
                const p = products.find(prod => prod.id === item.productId);
                if (p) p.stock_quantity = Math.max(0, p.stock_quantity - item.quantity);
            });
            LocalStoreManager.set('aura_products', products);

            // Clear Cart
            await CartService.clearCart();
            return newOrder;
        }
    },

    async getCustomerOrders() {
        const user = await AuthService.getCurrentUser();
        if (!user) return [];

        if (isSupabaseConfigured && supabaseClient) {
            const { data, error } = await supabaseClient
                .from('orders')
                .select(`
                    *,
                    items:order_items(*)
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        } else {
            const orders = LocalStoreManager.get('aura_orders');
            return orders.filter(o => o.user_id === user.id || o.customer_email === user.email);
        }
    },

    async getAllOrders(filters = {}) {
        if (isSupabaseConfigured && supabaseClient) {
            let query = supabaseClient
                .from('orders')
                .select(`
                    *,
                    items:order_items(*)
                `)
                .order('created_at', { ascending: false });

            if (filters.status && filters.status !== 'all') {
                query = query.eq('order_status', filters.status);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        } else {
            let orders = LocalStoreManager.get('aura_orders');
            if (filters.status && filters.status !== 'all') {
                orders = orders.filter(o => o.order_status === filters.status);
            }
            return orders;
        }
    },

    async updateOrderStatus(orderId, newStatus, courierName = '', trackingNumber = '') {
        const updates = {
            order_status: newStatus,
            updated_at: new Date().toISOString()
        };
        if (courierName) updates.courier_name = courierName;
        if (trackingNumber) updates.tracking_number = trackingNumber;

        if (isSupabaseConfigured && supabaseClient) {
            const { data, error } = await supabaseClient
                .from('orders')
                .update(updates)
                .eq('id', orderId)
                .select()
                .single();
            if (error) throw error;
            return data;
        } else {
            const orders = LocalStoreManager.get('aura_orders');
            const idx = orders.findIndex(o => o.id === orderId);
            if (idx !== -1) {
                orders[idx] = { ...orders[idx], ...updates };
                LocalStoreManager.set('aura_orders', orders);
                return orders[idx];
            }
            return null;
        }
    }
};

// ==============================================================================
// COUPON SERVICE
// ==============================================================================
const CouponService = {
    async validateCoupon(code, cartSubtotal) {
        if (!code) return { valid: false, message: 'Please enter a coupon code.' };
        const cleanCode = code.trim().toUpperCase();

        if (isSupabaseConfigured && supabaseClient) {
            const { data: coupon, error } = await supabaseClient
                .from('coupons')
                .select('*')
                .eq('code', cleanCode)
                .eq('is_active', true)
                .single();

            if (error || !coupon) {
                return { valid: false, message: 'Invalid or expired coupon code.' };
            }

            if (cartSubtotal < Number(coupon.min_order_amount)) {
                return {
                    valid: false,
                    message: `This coupon requires a minimum cart total of ${formatPKR(coupon.min_order_amount)}.`
                };
            }

            let discountAmount = 0;
            if (coupon.discount_type === 'percentage') {
                discountAmount = (cartSubtotal * Number(coupon.discount_value)) / 100;
            } else if (coupon.discount_type === 'fixed') {
                discountAmount = Number(coupon.discount_value);
            } else if (coupon.discount_type === 'free_shipping') {
                discountAmount = CONFIG.FLAT_SHIPPING_FEE;
            }

            return {
                valid: true,
                coupon: coupon,
                discountAmount: Math.min(discountAmount, cartSubtotal),
                message: `🎉 Coupon '${coupon.code}' applied successfully!`
            };
        } else {
            const coupons = LocalStoreManager.get('aura_coupons');
            const coupon = coupons.find(c => c.code === cleanCode && c.is_active);

            if (!coupon) {
                return { valid: false, message: 'Invalid or expired coupon code.' };
            }

            if (cartSubtotal < Number(coupon.min_order_amount)) {
                return {
                    valid: false,
                    message: `This coupon requires a minimum cart total of ${formatPKR(coupon.min_order_amount)}.`
                };
            }

            let discountAmount = 0;
            if (coupon.discount_type === 'percentage') {
                discountAmount = (cartSubtotal * Number(coupon.discount_value)) / 100;
            } else if (coupon.discount_type === 'fixed') {
                discountAmount = Number(coupon.discount_value);
            } else if (coupon.discount_type === 'free_shipping') {
                discountAmount = CONFIG.FLAT_SHIPPING_FEE;
            }

            return {
                valid: true,
                coupon: coupon,
                discountAmount: Math.min(discountAmount, cartSubtotal),
                message: `🎉 Coupon '${coupon.code}' applied successfully!`
            };
        }
    }
};

// ==============================================================================
// ADMIN METRICS & ANALYTICS SERVICE
// ==============================================================================
const AdminService = {
    async getDashboardStats() {
        const products = await ProductService.getProducts();
        const orders = await OrderService.getAllOrders();

        const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
        const totalOrders = orders.length;
        const pendingOrders = orders.filter(o => o.order_status === 'pending').length;
        const lowStockProducts = products.filter(p => p.stock_quantity <= (p.low_stock_threshold || 5));

        // Get unique customer count
        const uniqueEmails = new Set(orders.map(o => o.customer_email).filter(Boolean));
        const totalCustomers = Math.max(uniqueEmails.size, 1);

        return {
            totalRevenue,
            totalOrders,
            pendingOrders,
            totalProducts: products.length,
            lowStockCount: lowStockProducts.length,
            lowStockProducts,
            totalCustomers
        };
    },

    async getAllCustomers() {
        const orders = await OrderService.getAllOrders();
        const customersMap = {};

        orders.forEach(o => {
            const email = o.customer_email;
            if (!email) return;

            if (!customersMap[email]) {
                customersMap[email] = {
                    name: o.customer_name,
                    email: email,
                    phone: o.customer_phone,
                    city: o.city,
                    ordersCount: 0,
                    totalSpent: 0,
                    lastOrderDate: o.created_at
                };
            }
            customersMap[email].ordersCount += 1;
            customersMap[email].totalSpent += Number(o.total_amount) || 0;
            if (new Date(o.created_at) > new Date(customersMap[email].lastOrderDate)) {
                customersMap[email].lastOrderDate = o.created_at;
            }
        });

        return Object.values(customersMap);
    }
};

// Export services to window object for frontend scripts
if (typeof window !== 'undefined') {
    window.AuthService = AuthService;
    window.ProductService = ProductService;
    window.StorageService = StorageService;
    window.CartService = CartService;
    window.WishlistService = WishlistService;
    window.OrderService = OrderService;
    window.CouponService = CouponService;
    window.AdminService = AdminService;
    window.isSupabaseConfigured = () => isSupabaseConfigured;
}
