/* ==============================================================================
   LaVIDA — Products & Categories Data Access
   CRUD operations with dynamic Supabase queries and fallback mock support
   ============================================================================== */

import { getSupabaseClient } from './supabase-client.js';
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from './mock-data.js';

const LOCAL_PRODUCTS_KEY = 'lavida_local_products';
const LOCAL_CATEGORIES_KEY = 'lavida_local_categories';

function getLocalProducts() {
  const saved = localStorage.getItem(LOCAL_PRODUCTS_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(MOCK_PRODUCTS));
  return MOCK_PRODUCTS;
}

function setLocalProducts(products) {
  localStorage.setItem(LOCAL_PRODUCTS_KEY, JSON.stringify(products));
}

function getLocalCategories() {
  const saved = localStorage.getItem(LOCAL_CATEGORIES_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(MOCK_CATEGORIES));
  return MOCK_CATEGORIES;
}

function setLocalCategories(cats) {
  localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(cats));
}

/**
 * Fetch all categories
 */
export async function getCategories() {
  const supabase = await getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Error fetching categories from Supabase, falling back to local:', error);
      return getLocalCategories();
    }
    return data || [];
  }

  return getLocalCategories();
}

/**
 * Fetch products with filtering, search, sorting
 */
export async function getProducts(options = {}) {
  const {
    categoryId = null,
    search = '',
    sort = 'featured', // 'featured', 'price-low', 'price-high', 'name'
    featuredOnly = false,
    availableOnly = false
  } = options;

  const supabase = await getSupabaseClient();

  if (supabase) {
    let query = supabase
      .from('products')
      .select('*, categories(name)');

    if (categoryId && categoryId !== 'all') {
      query = query.eq('category_id', categoryId);
    }

    if (featuredOnly) {
      query = query.eq('featured', true);
    }

    if (availableOnly) {
      query = query.eq('available', true);
    }

    if (search && search.trim() !== '') {
      query = query.ilike('name', `%${search.trim()}%`);
    }

    // Sort order
    if (sort === 'price-low') {
      query = query.order('price', { ascending: true });
    } else if (sort === 'price-high') {
      query = query.order('price', { ascending: false });
    } else if (sort === 'name') {
      query = query.order('name', { ascending: true });
    } else {
      query = query.order('featured', { ascending: false }).order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Supabase products fetch failed, using local:', error);
      return filterLocalProducts(options);
    }

    return (data || []).map(p => ({
      ...p,
      category_name: p.categories?.name || 'Specialty'
    }));
  }

  return filterLocalProducts(options);
}

function filterLocalProducts(options) {
  let list = [...getLocalProducts()];
  const categories = getLocalCategories();
  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

  list = list.map(p => ({
    ...p,
    category_name: catMap[p.category_id] || 'Specialty'
  }));

  if (options.categoryId && options.categoryId !== 'all') {
    list = list.filter(p => p.category_id === options.categoryId);
  }

  if (options.featuredOnly) {
    list = list.filter(p => p.featured === true);
  }

  if (options.availableOnly) {
    list = list.filter(p => p.available === true);
  }

  if (options.search && options.search.trim()) {
    const q = options.search.toLowerCase().trim();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.category_name && p.category_name.toLowerCase().includes(q))
    );
  }

  if (options.sort === 'price-low') {
    list.sort((a, b) => a.price - b.price);
  } else if (options.sort === 'price-high') {
    list.sort((a, b) => b.price - a.price);
  } else if (options.sort === 'name') {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  return list;
}

/**
 * Fetch a single product by ID
 */
export async function getProductById(id) {
  const supabase = await getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return {
      ...data,
      category_name: data.categories?.name || 'Specialty'
    };
  }

  const list = filterLocalProducts({});
  const product = list.find(p => p.id === id);
  if (!product) throw new Error('Product not found.');
  return product;
}

/**
 * Admin: Create Product
 */
export async function createProduct(data) {
  const supabase = await getSupabaseClient();

  if (supabase) {
    const { data: created, error } = await supabase
      .from('products')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return created;
  }

  const products = getLocalProducts();
  const newProduct = {
    ...data,
    id: 'p-' + Date.now(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  products.unshift(newProduct);
  setLocalProducts(products);
  return newProduct;
}

/**
 * Admin: Update Product
 */
export async function updateProduct(id, data) {
  const supabase = await getSupabaseClient();

  if (supabase) {
    const { data: updated, error } = await supabase
      .from('products')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updated;
  }

  const products = getLocalProducts();
  const index = products.findIndex(p => p.id === id);
  if (index === -1) throw new Error('Product not found.');

  products[index] = { ...products[index], ...data, updated_at: new Date().toISOString() };
  setLocalProducts(products);
  return products[index];
}

/**
 * Admin: Delete Product
 */
export async function deleteProduct(id) {
  const supabase = await getSupabaseClient();

  if (supabase) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  const products = getLocalProducts().filter(p => p.id !== id);
  setLocalProducts(products);
  return true;
}

/**
 * Admin: Toggle Product Availability
 */
export async function toggleProductAvailability(id, available) {
  return updateProduct(id, { available });
}

/**
 * Admin: Create Category
 */
export async function createCategory(data) {
  const supabase = await getSupabaseClient();

  if (supabase) {
    const { data: created, error } = await supabase
      .from('categories')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return created;
  }

  const categories = getLocalCategories();
  const newCat = {
    ...data,
    id: 'c-' + Date.now(),
    created_at: new Date().toISOString()
  };
  categories.push(newCat);
  setLocalCategories(categories);
  return newCat;
}

/**
 * Admin: Update Category
 */
export async function updateCategory(id, data) {
  const supabase = await getSupabaseClient();

  if (supabase) {
    const { data: updated, error } = await supabase
      .from('categories')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updated;
  }

  const categories = getLocalCategories();
  const index = categories.findIndex(c => c.id === id);
  if (index === -1) throw new Error('Category not found');

  categories[index] = { ...categories[index], ...data };
  setLocalCategories(categories);
  return categories[index];
}

/**
 * Admin: Delete Category with Safety Check
 */
export async function deleteCategory(id) {
  // Check if any product is assigned to this category
  const products = await getProducts({ categoryId: id });
  if (products.length > 0) {
    throw new Error(`Cannot delete this category because ${products.length} product(s) are assigned to it. Please reassign them first.`);
  }

  const supabase = await getSupabaseClient();

  if (supabase) {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  const categories = getLocalCategories().filter(c => c.id !== id);
  setLocalCategories(categories);
  return true;
}
