/* ==============================================================================
   LaVIDA — Mock Seed Data & Demo Store
   Provides fallback data for immediate preview & zero-config testing
   ============================================================================== */

export const MOCK_CATEGORIES = [
  {
    id: 'c1000000-0000-0000-0000-000000000001',
    name: 'Burgers & Sandwiches',
    description: 'Gourmet smashed patties, brioche buns, and house sauces.',
    image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000002',
    name: 'Artisan Pizzas',
    description: 'Wood-fired sourdough crust with San Marzano tomatoes.',
    image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000003',
    name: 'Royal Biryani & Bowls',
    description: 'Aromatic basmati rice slow-cooked with signature spices.',
    image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000004',
    name: 'Crispy Fried Chicken',
    description: 'Buttermilk marinated, double-dredged golden crunch.',
    image_url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000005',
    name: 'Drinks & Mocktails',
    description: 'Handcrafted coolers, refreshing teas, and artisan sodas.',
    image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80',
    created_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000006',
    name: 'Decadent Desserts',
    description: 'Warm molten cakes, artisan cheesecakes and gelato.',
    image_url: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&auto=format&fit=crop&q=80',
    created_at: '2026-01-01T00:00:00Z'
  }
];

export const MOCK_PRODUCTS = [
  {
    id: 'p1000000-0000-0000-0000-000000000001',
    category_id: 'c1000000-0000-0000-0000-000000000001',
    name: 'Truffle Umami Smash Burger',
    description: 'Double Angus beef smash patty, truffle black garlic aioli, aged sharp cheddar, caramelized shallots on toasted butter brioche.',
    price: 12.99,
    image_url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80',
    featured: true,
    available: true,
    rating: 4.9,
    reviews_count: 142
  },
  {
    id: 'p1000000-0000-0000-0000-000000000012',
    category_id: 'c1000000-0000-0000-0000-000000000001',
    name: 'Spicy Nashville Crisp Burger',
    description: 'Crispy buttermilk fried chicken breast, cayenne glaze, dill pickles, cool herb slaw, chipotle ranch on brioche.',
    price: 11.49,
    image_url: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=600&auto=format&fit=crop&q=80',
    featured: true,
    available: true,
    rating: 4.8,
    reviews_count: 98
  },
  {
    id: 'p1000000-0000-0000-0000-000000000002',
    category_id: 'c1000000-0000-0000-0000-000000000002',
    name: 'Burrata Margherita Pizza',
    description: 'San Marzano D.O.P tomato sauce, fresh creamy burrata, sweet Genovese basil, cold-pressed extra virgin olive oil.',
    price: 15.99,
    image_url: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=600&auto=format&fit=crop&q=80',
    featured: true,
    available: true,
    rating: 4.9,
    reviews_count: 215
  },
  {
    id: 'p1000000-0000-0000-0000-000000000022',
    category_id: 'c1000000-0000-0000-0000-000000000002',
    name: 'Spicy Pepperoni & Hot Honey Pizza',
    description: 'Crisp cupping pepperoni, fresh mozzarella, jalapeño rings, drizzled with spicy habanero infused wildflower honey.',
    price: 16.50,
    image_url: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&auto=format&fit=crop&q=80',
    featured: false,
    available: true,
    rating: 4.7,
    reviews_count: 89
  },
  {
    id: 'p1000000-0000-0000-0000-000000000003',
    category_id: 'c1000000-0000-0000-0000-000000000003',
    name: 'Royal Dum Hyderabadi Biryani',
    description: 'Tender bone-in chicken marinated in secret spices, layered with saffron basmati rice, sealed and slow cooked in sealed pot.',
    price: 14.99,
    image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
    featured: true,
    available: true,
    rating: 5.0,
    reviews_count: 320
  },
  {
    id: 'p1000000-0000-0000-0000-000000000032',
    category_id: 'c1000000-0000-0000-0000-000000000003',
    name: 'Shahi Paneer Tikka Rice Bowl',
    description: 'Clay-oven charcoal roasted paneer cubes tossed in rich cashew tomato gravy over aromatic cumin butter rice.',
    price: 13.50,
    image_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80',
    featured: false,
    available: true,
    rating: 4.6,
    reviews_count: 67
  },
  {
    id: 'p1000000-0000-0000-0000-000000000004',
    category_id: 'c1000000-0000-0000-0000-000000000004',
    name: 'Korean Sticky Garlic Wings (8 pcs)',
    description: 'Double fried crunchy chicken wings tossed in rich sweet garlic soy reduction, garnished with scallions and roasted sesame.',
    price: 10.99,
    image_url: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=600&auto=format&fit=crop&q=80',
    featured: true,
    available: true,
    rating: 4.9,
    reviews_count: 178
  },
  {
    id: 'p1000000-0000-0000-0000-000000000042',
    category_id: 'c1000000-0000-0000-0000-000000000004',
    name: 'Golden Crunch Tenders & Waffle Fries',
    description: 'Hand breaded whole chicken breast tenderloins, seasoned crispy waffle fries, signature honey mustard dip.',
    price: 9.99,
    image_url: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&auto=format&fit=crop&q=80',
    featured: false,
    available: true,
    rating: 4.8,
    reviews_count: 112
  },
  {
    id: 'p1000000-0000-0000-0000-000000000005',
    category_id: 'c1000000-0000-0000-0000-000000000005',
    name: 'Passionfruit Mint Fizz',
    description: 'Sparkling artisanal soda with real passionfruit pulp, fresh crushed garden mint, citrus lime, and organic cane sugar.',
    price: 4.99,
    image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
    featured: false,
    available: true,
    rating: 4.7,
    reviews_count: 53
  },
  {
    id: 'p1000000-0000-0000-0000-000000000052',
    category_id: 'c1000000-0000-0000-0000-000000000005',
    name: 'Iced Salted Caramel Cold Brew',
    description: 'Slow cold-steeped Arabica blend topped with dense vanilla-caramel sea salt foam and a dash of cocoa.',
    price: 5.49,
    image_url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80',
    featured: false,
    available: true,
    rating: 4.8,
    reviews_count: 88
  },
  {
    id: 'p1000000-0000-0000-0000-000000000006',
    category_id: 'c1000000-0000-0000-0000-000000000006',
    name: 'Molten Lava Chocolate Cake',
    description: 'Warm Belgian 70% dark chocolate cake with rich liquid fudge center, served with Madagascan vanilla bean gelato.',
    price: 7.99,
    image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80',
    featured: true,
    available: true,
    rating: 4.9,
    reviews_count: 194
  },
  {
    id: 'p1000000-0000-0000-0000-000000000062',
    category_id: 'c1000000-0000-0000-0000-000000000006',
    name: 'New York Berry Cheesecake',
    description: 'Velvety slow-baked Philadelphia cream cheese on buttery graham crust, topped with macerated wild strawberries.',
    price: 6.99,
    image_url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&auto=format&fit=crop&q=80',
    featured: false,
    available: true,
    rating: 4.8,
    reviews_count: 130
  }
];

export const MOCK_ORDERS = [
  {
    id: 'ord-849201',
    user_id: 'usr-customer-1',
    customer_name: 'Alex Rivera',
    customer_phone: '+1 (555) 234-5678',
    delivery_address: '742 Evergreen Terrace, Apt 4B, Springfield',
    delivery_instructions: 'Ring doorbell twice. Leave at front doorstep.',
    subtotal: 36.97,
    delivery_fee: 0.00,
    total: 36.97,
    status: 'preparing',
    payment_method: 'Cash on Delivery',
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    items: [
      {
        id: 'item-1',
        product_id: 'p1000000-0000-0000-0000-000000000001',
        product_name: 'Truffle Umami Smash Burger',
        quantity: 2,
        unit_price: 12.99,
        subtotal: 25.98
      },
      {
        id: 'item-2',
        product_id: 'p1000000-0000-0000-0000-000000000004',
        product_name: 'Korean Sticky Garlic Wings (8 pcs)',
        quantity: 1,
        unit_price: 10.99,
        subtotal: 10.99
      }
    ]
  },
  {
    id: 'ord-731902',
    user_id: 'usr-customer-1',
    customer_name: 'Alex Rivera',
    customer_phone: '+1 (555) 234-5678',
    delivery_address: '742 Evergreen Terrace, Apt 4B, Springfield',
    delivery_instructions: '',
    subtotal: 28.98,
    delivery_fee: 3.99,
    total: 32.97,
    status: 'delivered',
    payment_method: 'Cash on Delivery',
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    items: [
      {
        id: 'item-3',
        product_id: 'p1000000-0000-0000-0000-000000000002',
        product_name: 'Burrata Margherita Pizza',
        quantity: 1,
        unit_price: 15.99,
        subtotal: 15.99
      },
      {
        id: 'item-4',
        product_id: 'p1000000-0000-0000-0000-000000000001',
        product_name: 'Truffle Umami Smash Burger',
        quantity: 1,
        unit_price: 12.99,
        subtotal: 12.99
      }
    ]
  }
];
