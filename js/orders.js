/* ==============================================================================
   LaVIDA — Order Management & Checkout Processing
   Validates cart, calculates safe totals, persists orders & order_items
   ============================================================================== */

import { getSupabaseClient } from './supabase-client.js';
import { getCurrentUser } from './auth.js';
import { getCart, getCartTotals, clearCart } from './cart.js';
import { getProductById } from './products.js';
import { MOCK_ORDERS } from './mock-data.js';

const LOCAL_ORDERS_KEY = 'lavida_local_orders';

function getLocalOrders() {
  const saved = localStorage.getItem(LOCAL_ORDERS_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(MOCK_ORDERS));
  return MOCK_ORDERS;
}

function setLocalOrders(orders) {
  localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
}

/**
 * Place a new order
 */
export async function createOrder({
  customerName,
  customerPhone,
  deliveryAddress,
  deliveryInstructions = '',
  paymentMethod = 'Cash on Delivery'
}) {
  const cart = getCart();
  if (!cart || cart.length === 0) {
    throw new Error('Your cart is empty. Please add items before checking out.');
  }

  if (!customerName || !customerPhone || !deliveryAddress) {
    throw new Error('Please fill in your name, contact phone, and delivery address.');
  }

  const user = await getCurrentUser();

  // Validate prices & availability against actual product records
  let validatedSubtotal = 0;
  const validatedItems = [];

  for (const item of cart) {
    const product = await getProductById(item.id);
    if (!product) {
      throw new Error(`Item "${item.name}" is no longer available.`);
    }
    if (!product.available) {
      throw new Error(`Item "${product.name}" is currently out of stock.`);
    }

    const unitPrice = Number(product.price);
    const lineSubtotal = Number((unitPrice * item.quantity).toFixed(2));
    validatedSubtotal += lineSubtotal;

    validatedItems.push({
      product_id: product.id,
      product_name: product.name,
      quantity: item.quantity,
      unit_price: unitPrice,
      subtotal: lineSubtotal
    });
  }

  const validatedDeliveryFee = validatedSubtotal >= 35.00 ? 0.00 : 3.99;
  const validatedTotal = Number((validatedSubtotal + validatedDeliveryFee).toFixed(2));

  const supabase = await getSupabaseClient();

  if (supabase) {
    // 1. Create order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([{
        user_id: user ? user.id : null,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        delivery_address: deliveryAddress.trim(),
        delivery_instructions: deliveryInstructions ? deliveryInstructions.trim() : null,
        subtotal: validatedSubtotal,
        delivery_fee: validatedDeliveryFee,
        total: validatedTotal,
        status: 'pending',
        payment_method: paymentMethod
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    // 2. Create order items
    const itemsPayload = validatedItems.map(item => ({
      order_id: orderData.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.subtotal
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsPayload);

    if (itemsError) throw itemsError;

    clearCart();
    return { ...orderData, items: validatedItems };
  } else {
    // Demo Mock Fallback
    const newOrderId = 'ord-' + Math.floor(100000 + Math.random() * 900000);
    const newOrder = {
      id: newOrderId,
      user_id: user ? user.id : 'usr-guest',
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      delivery_address: deliveryAddress.trim(),
      delivery_instructions: deliveryInstructions ? deliveryInstructions.trim() : '',
      subtotal: validatedSubtotal,
      delivery_fee: validatedDeliveryFee,
      total: validatedTotal,
      status: 'pending',
      payment_method: paymentMethod,
      created_at: new Date().toISOString(),
      items: validatedItems
    };

    const orders = getLocalOrders();
    orders.unshift(newOrder);
    setLocalOrders(orders);

    clearCart();
    return newOrder;
  }
}

/**
 * Fetch a specific order by ID
 */
export async function getOrderById(orderId) {
  const supabase = await getSupabaseClient();

  if (supabase) {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;
    return {
      ...order,
      items: order.order_items || []
    };
  }

  const orders = getLocalOrders();
  const order = orders.find(o => o.id === orderId);
  if (!order) throw new Error('Order not found');
  return order;
}

/**
 * Fetch all orders for current user
 */
export async function getUserOrders(userId) {
  const supabase = await getSupabaseClient();

  if (supabase && userId) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(o => ({
      ...o,
      items: o.order_items || []
    }));
  }

  const orders = getLocalOrders();
  if (userId) {
    return orders.filter(o => o.user_id === userId);
  }
  return orders;
}

/**
 * Admin: Fetch all orders with filtering
 */
export async function getAllOrders(filters = {}) {
  const { status = 'all', search = '' } = filters;
  const supabase = await getSupabaseClient();

  if (supabase) {
    let query = supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search && search.trim() !== '') {
      query = query.or(`customer_name.ilike.%${search.trim()}%,customer_phone.ilike.%${search.trim()}%,id.ilike.%${search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(o => ({
      ...o,
      items: o.order_items || []
    }));
  }

  let orders = [...getLocalOrders()];
  if (status && status !== 'all') {
    orders = orders.filter(o => o.status === status);
  }
  if (search && search.trim()) {
    const q = search.toLowerCase().trim();
    orders = orders.filter(o =>
      o.id.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.customer_phone.toLowerCase().includes(q)
    );
  }
  return orders;
}

/**
 * Admin: Update order status
 */
export async function updateOrderStatus(orderId, newStatus) {
  const validStatuses = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
  if (!validStatuses.includes(newStatus)) {
    throw new Error('Invalid order status.');
  }

  const supabase = await getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  const orders = getLocalOrders();
  const index = orders.findIndex(o => o.id === orderId);
  if (index === -1) throw new Error('Order not found');

  orders[index].status = newStatus;
  orders[index].updated_at = new Date().toISOString();
  setLocalOrders(orders);
  return orders[index];
}
