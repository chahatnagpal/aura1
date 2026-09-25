# 🔥 LaVIDA — Food, Made to Crave
> **"Good food. No complicated decisions."**

A complete, modern, production-style restaurant e-commerce web application with **Supabase backend integration**, real-time shopping cart, user authentication, customer order tracking, and a protected **Admin Management Dashboard**.

---

## 🚀 Live Features Overview

### 1. Customer Food Ordering Platform
- **Appetizing Homepage (`index.html`)**: Dynamic Hero showcase, popular category exploration chips, chef's popular dishes with quick-add to bag, brand value pillars, and limited-time promo banners.
- **Dynamic Menu & Filtering (`menu.html`)**: Real-time category pills filtering, search input with instant clear, price sorting (Low to High / High to Low), featured showcases, and stock availability toggles.
- **Product Detail Quick View**: Interactive modal with high-res food photography, ingredient breakdown, quantity counter, and dynamic price calculations.
- **Reactive Shopping Bag Drawer**: Persistent offcanvas cart stored in `localStorage`, quantity increment/decrement, line removals, live subtotal/tax/delivery fee calculations, and free delivery tracker (Free over $35).
- **Streamlined Checkout (`checkout.html`)**: Delivery details form (name, phone, address, custom delivery instructions), **Cash on Delivery (COD)** payment selection, and full server-safe order validation.
- **Order Confirmation Receipt (`order-confirmation.html`)**: Celebration confirmation screen with **Order ID copy button**, itemized receipt, delivery address, and live **5-step status progression stepper** (`Pending` ➔ `Confirmed` ➔ `Preparing` ➔ `Out for Delivery` ➔ `Delivered`).
- **Customer Dashboard (`account.html`)**: User profile editor, active and past order history with timestamps, item summaries, and 1-click reorder support.
- **Supabase Authentication (`auth.html`)**: Secure Sign In and Registration with full validation, password security, session persistence, and built-in **Quick Demo Account buttons** for instant preview.

### 2. Protected Admin Dashboard (`admin.html`)
- **Role-Based Access Control (RBAC)**: Protected route that automatically verifies admin credentials (`role = 'admin'`).
- **Live KPI Overview**: Real-time business metrics — Total Revenue, Active Orders needing fulfillment, Completed Orders, and Total Menu Items.
- **Product Catalog CRUD**:
  - **Create**: Add new dishes with title, category, price, description, featured showcase toggle, and availability.
  - **Read**: Responsive table with thumbnails, categories, pricing, and stock tags.
  - **Update**: Edit pricing, description, category, and toggle live stock status.
  - **Delete**: Safe removal with confirmation dialog.
- **Category Management**: Full CRUD for menu categories with built-in safety checks (prevents deleting categories with assigned items).
- **Live Orders Queue & Fulfillment**: Filter orders by status, inspect customer phone & delivery notes, view ordered items, and execute status transitions (`Pending` ➔ `Confirmed` ➔ `Preparing` ➔ `Out for Delivery` ➔ `Delivered` / `Cancelled`).
- **Media & Image Handling**: Integrated with **Supabase Storage** (`product-images` bucket) with drag-and-drop file upload, file validation (under 5MB), and direct URL previews.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: Clean Modern HTML5, Modular CSS3 (Custom Design System tokens, CSS Grid, Flexbox, Mobile-First), ES6 JavaScript Modules.
- **Backend / BaaS**: [Supabase](https://supabase.com) (PostgreSQL Database, Supabase Auth, Row Level Security, Supabase Storage).
- **Icons & Assets**: Responsive SVG iconography, curated Unsplash culinary photography.
- **Zero Build Friction**: Runs out-of-the-box in any standard browser or web host (Netlify, Vercel, GitHub Pages, Cloudflare Pages) without complex build tools.

---

## 📂 Project Structure

```text
├── index.html                # Main homepage & hero showcase
├── menu.html                 # Dynamic full menu with search & filters
├── checkout.html             # Multi-step checkout process
├── order-confirmation.html   # Receipt & live order progress stepper
├── account.html              # Customer profile & order history
├── auth.html                 # Sign In & Registration portal
├── admin.html                # Protected Admin management dashboard
├── about.html                # Brand philosophy & standards
├── contact.html              # Location & contact inquiry
├── css/
│   ├── variables.css         # Design tokens (colors, fonts, shadows)
│   ├── base.css              # Reset, typography, buttons, badges
│   ├── layout.css            # Header, sticky nav, mobile drawer, footer
│   ├── components.css        # Product cards, cart drawer, modals, toasts
│   ├── pages.css             # Page-specific layouts
│   └── admin.css             # Admin dashboard UI, KPIs, tables
├── js/
│   ├── config.js             # Supabase & app configuration manager
│   ├── supabase-client.js    # Supabase JS v2 client wrapper
│   ├── mock-data.js          # Fallback seed data for zero-config preview
│   ├── auth.js               # Auth, session, roles & route guards
│   ├── products.js           # Product & category CRUD operations
│   ├── cart.js               # Reactive shopping bag store & totals
│   ├── orders.js             # Order creation, validation & fulfillment
│   ├── storage.js            # Supabase Storage bucket image uploads
│   ├── admin.js              # Admin dashboard controller
│   └── ui.js                 # Toasts, modals, drawer, headers & config modal
├── supabase/
│   ├── schema.sql            # PostgreSQL database schema & RLS policies
│   └── storage.sql           # Storage bucket setup & storage policies
├── server.py                 # Lightweight Python local dev server
├── .env.example              # Environment variables template
└── README.md                 # Project documentation
```

---

## ⚡ Connecting to Supabase (3 Easy Steps)

The application includes an **in-app Supabase Connection Setup Modal** as well as database migration files ready to execute.

### Step 1: Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and create a free project.
2. Under **Project Settings > API**, copy your **Project URL** and **anon public key**.

### Step 2: Run Database Migrations
1. Open the **SQL Editor** in your Supabase Dashboard.
2. Copy the contents of [`supabase/schema.sql`](supabase/schema.sql) and paste into the editor, then click **Run**.
   - This creates the `categories`, `products`, `profiles`, `orders`, and `order_items` tables.
   - It sets up automatic updated_at timestamps and auto-profile creation on user signup.
   - It enables **Row Level Security (RLS)** with secure policies for customers and admins.
   - It inserts initial seed data for categories and popular dishes.
3. In the SQL Editor, copy and run [`supabase/storage.sql`](supabase/storage.sql) to provision the `product-images` storage bucket.

### Step 3: Connect the Website
Click the **"⚡ Supabase Settings"** button in the website top banner or footer, paste your `SUPABASE_URL` and `SUPABASE_ANON_KEY`, click **Test Connection**, and save!

Alternatively, set your credentials in `window.ENV` or environment variables for server deployments.

---

## 🔒 Database Architecture & Row Level Security (RLS)

| Table | Public / Customer Permissions | Admin Permissions |
| :--- | :--- | :--- |
| `categories` | `SELECT` (Public read) | `ALL` (Create, Update, Delete) |
| `products` | `SELECT` (Available products only) | `ALL` (Full CRUD across all items) |
| `profiles` | `SELECT` & `UPDATE` (Own record only) | `ALL` (Read and manage all users) |
| `orders` | `INSERT` & `SELECT` (Own orders only) | `SELECT` & `UPDATE` (All orders & status) |
| `order_items` | `INSERT` & `SELECT` (Own order items) | `SELECT` (All order items) |

### Creating an Admin User in Supabase:
When a user signs up, their default role is `customer`. To promote an account to `admin`:
1. In your Supabase Dashboard, navigate to **Table Editor > profiles**.
2. Find the user row and change `role` to `admin`.
3. The user can now access `/admin.html` and manage products, categories, and orders.

---

## 💻 Running the Project Locally

You can run the application with Python:

```bash
python server.py
```

Then open your browser at:
```
http://localhost:3000
```
