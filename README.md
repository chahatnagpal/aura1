# Aura Lifestyle — Pakistani E-Commerce Store

A modern, responsive, full-stack Pakistani lifestyle e-commerce platform selling fashion accessories, aesthetic jewelry, beauty & skincare tools, small gifts, bags, and cute lifestyle products.

Built with **HTML5, CSS3, Vanilla JavaScript**, and **Supabase (PostgreSQL, Auth, Storage, Row Level Security)**.

---

## 🌟 Key Features

### 🛍️ Customer Storefront (`index.html`)
- **Pakistani Market Localization**:
  - All prices formatted in **Pakistani Rupees (PKR / Rs.)**.
  - **Cash on Delivery (COD)** payment flow with doorstep receipt.
  - Pre-configured **Pakistani Cities Selector** (Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta, Sialkot, Hyderabad, etc.).
  - Pakistani mobile number validation (`03XX-XXXXXXX`).
  - Courier dispatch notices (TCS Express, Trax Logistics, Leopards Courier).
  - Floating WhatsApp Customer Support link.
- **Home & Catalog**:
  - Hero banner with float badges, store statistics, and Pakistani delivery guarantees.
  - Interactive category highlights with high-res lifestyle imagery.
  - Tabbed featured products: *All Picks, Featured, New Arrivals, Under Rs. 999 Steals, On Sale*.
  - Shop page with live keyword search, category radio filters, max price slider (Rs. 400 - Rs. 3,000+), in-stock & on-sale filters, and sorting.
- **Product Experience**:
  - Quick View Modal with image zoom, rating stars, stock counter (`In Stock`, `Low Stock`, `Sold Out`), variant selector pills (Color/Size/Fragrance), and quantity steppers.
  - Wishlist system with heart animations and "Move to Bag" capability.
- **Cart & Checkout**:
  - Slide-out Cart Drawer with interactive **Free Shipping Progress Goal** (e.g. Free shipping on orders over Rs. 2,499).
  - Coupon code discounts (`AURA10` for 10% off, `FREESHIP` for free shipping, `EIDGIFT` for flat Rs. 250 off).
  - Multi-step Pakistani checkout form with instant order confirmation modal, printable invoice, and WhatsApp order confirmation.
- **Customer Account**:
  - Signup / Login with Supabase Auth.
  - Profile management (name, phone, default delivery city & address).
  - Live Order History with 4-step progress tracking (*Pending → Processing → Shipped → Delivered*).

---

### 🔐 Admin Management Portal (`admin.html`)
- **Secure Access Guard**:
  - Protected route requiring an authenticated user with `is_admin = true` verified by Supabase RLS.
  - Unauthorized visitors see admin login overlay.
- **Dashboard Overview**:
  - Key performance metric cards: **Total Revenue (PKR)**, **Total Orders**, **Pending Orders**, **Total Products**, **Low Stock Alerts**.
  - Recent orders table with fast fulfillment action.
  - Automatic low-stock inventory warnings.
- **Product Management**:
  - Add, edit, and delete products.
  - Direct file upload to **Supabase Storage Bucket (`product-images`)** or direct image URL.
  - Manage prices (Selling Price & Compare-at Price), stock counts, low stock thresholds, and tags (*Featured, Sale, New Arrival*).
  - Variant configurations (e.g. Colors, Sizes).
- **Category Management**:
  - Add, edit, and delete product categories with image icons and descriptions.
- **Order Management & Fulfillment**:
  - Filter orders by status (*All, Pending, Processing, Shipped, Delivered, Cancelled*).
  - Order details modal with customer phone, delivery address, city, and itemized line items.
  - Assign courier partner (TCS, Trax, Leopards, Call Courier) and courier tracking ID.
  - 1-Click Printable Packing Slip / Invoice.
- **Customer Directory**:
  - List of customer profiles, order counts, and total amount spent in PKR.

---

## 🚀 Getting Started Locally

No complex build tools or Node.js required! You can run the website locally using any standard static file server:

### Option 1: Using Python
```bash
# In the website folder:
python -m http.server 8000
```
Then open [http://localhost:8000](http://localhost:8000) in your browser.

### Option 2: VS Code Live Server
Right-click on `index.html` and click **"Open with Live Server"**.

> **Note**: The application includes an intelligent fallback store with 16+ Pakistani lifestyle starter products, so you can test the complete storefront, cart, wishlist, checkout, and admin portal immediately even before configuring Supabase!

---

## 🗄️ Supabase Backend Setup Guide

To connect your own live cloud PostgreSQL database and Supabase Auth/Storage:

### Step 1: Create a Free Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and create an account.
2. Click **"New Project"**, name it `aura-lifestyle`, choose a region near Pakistan (e.g. `Singapore` or `Frankfurt`), and set a database password.

### Step 2: Run the Database Schema
1. In your Supabase Dashboard, click on **"SQL Editor"** from the left sidebar.
2. Click **"New query"**.
3. Open the [`supabase-schema.sql`](./supabase-schema.sql) file from this repository, copy all its content, paste it into the SQL editor, and click **"Run"**.
4. This script automatically:
   - Creates all tables (`profiles`, `categories`, `products`, `product_images`, `product_variants`, `cart_items`, `wishlist_items`, `orders`, `order_items`, `coupons`).
   - Enables **Row Level Security (RLS)** on all tables.
   - Creates the `is_admin()` security function.
   - Configures the `product-images` storage bucket and access policies.
   - Seeds the catalog with 16+ Pakistani lifestyle items and starter coupon codes (`AURA10`, `FREESHIP`).

### Step 3: Configure Frontend Credentials
1. In Supabase Dashboard, go to **Project Settings** (gear icon) → **API**.
2. Copy your **Project URL** and **Project API Key (anon / public)**.
3. Open `js/config.js` and replace the values:
```javascript
const CONFIG = {
    SUPABASE_URL: 'https://YOUR_PROJECT_ID.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    // ...
};
```
> ⚠️ **Important**: NEVER use your `service_role` secret key in frontend code. The `anon` public key is completely safe because database security is enforced by the Row Level Security (RLS) policies created in `supabase-schema.sql`.

### Step 4: Create Your Admin Account
1. Open `index.html` in your browser and click on the account icon to sign up a new account with your admin email (e.g. `admin@auralifestyle.pk`).
2. In your Supabase Dashboard → **SQL Editor**, run this query to grant admin privileges:
```sql
UPDATE public.profiles
SET is_admin = TRUE
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@auralifestyle.pk');
```
3. Now navigate to `admin.html` and sign in with your email and password to access the full admin dashboard!

---

## 📂 Project Structure

```
website/
├── index.html              # Customer storefront (Home, Shop, Cart, Wishlist, Checkout, Account)
├── admin.html              # Secure Admin Panel (Dashboard, Products, Categories, Orders, Customers)
├── css/
│   ├── style.css           # Storefront luxury pastel styling, responsive grid, drawers, modals
│   └── admin.css           # Admin SaaS portal styling, KPI cards, data tables, status badges
├── js/
│   ├── config.js           # Supabase config, Pakistani cities, shipping rules, PKR formatting
│   ├── supabase-client.js  # Supabase SDK client, Auth, DB queries, Storage upload, & offline store
│   ├── app.js              # Storefront controller: Catalog filtering, search, cart, checkout
│   └── admin.js            # Admin controller: Auth guard, dashboard stats, product CRUD, orders
├── supabase-schema.sql     # Complete PostgreSQL schema, RLS policies, storage bucket, and seed data
└── README.md               # Project documentation
```

---

## 🔒 Row Level Security (RLS) Summary

| Table | Public / Anonymous | Authenticated Customer | Admin (`is_admin: true`) |
|---|---|---|---|
| `products` | `SELECT` (Read) | `SELECT` (Read) | `ALL` (Create, Update, Delete) |
| `categories` | `SELECT` (Read) | `SELECT` (Read) | `ALL` (Create, Update, Delete) |
| `cart_items` | `DENIED` | `ALL` (Own cart only: `user_id = auth.uid()`) | `ALL` |
| `wishlist_items` | `DENIED` | `ALL` (Own wishlist only: `user_id = auth.uid()`) | `ALL` |
| `orders` | `INSERT` (Guest checkout) | `SELECT` / `INSERT` (Own orders only) | `ALL` (View all, update status) |
| `order_items` | `INSERT` | `SELECT` / `INSERT` (Own orders only) | `ALL` |
| `profiles` | `DENIED` | `SELECT` / `UPDATE` (Own profile only) | `SELECT` (All profiles) |
| `storage (product-images)` | `SELECT` (Public download) | `DENIED` | `ALL` (Upload, Delete images) |

---

## 📱 Responsive Testing
- **Mobile (< 768px)**: 2-column product grid, mobile drawer menu, slide-out cart, and fixed bottom navigation bar (*Home, Shop, Wishlist, Cart, Account*).
- **Tablet (768px - 1024px)**: 3-column product grid, responsive modal overlays.
- **Desktop (> 1024px)**: 4-column product grid, persistent filter sidebar, sticky navigation bar.

---

## 📄 License
MIT License. Created for Pakistani e-commerce lifestyle brands.
