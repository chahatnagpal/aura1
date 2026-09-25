/* ==============================================================================
   LaVIDA — Shopping Cart Logic & Drawer UI
   Reactive cart state management with persistent storage and total calculations
   ============================================================================== */

import { APP_CONFIG } from './config.js';

const CART_STORAGE_KEY = 'lavida_shopping_cart';

export function getCart() {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (err) {
    console.error('Error reading cart from localStorage:', err);
    return [];
  }
}

export function saveCart(cart) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('lavida:cart_updated', { detail: { cart } }));
    updateCartBadges();
  } catch (err) {
    console.error('Error saving cart to localStorage:', err);
  }
}

export function addToCart(product, quantity = 1) {
  if (!product || !product.id) return;
  if (!product.available) {
    throw new Error('This item is currently out of stock.');
  }

  const cart = getCart();
  const existingIndex = cart.findIndex(item => item.id === product.id);

  if (existingIndex > -1) {
    cart[existingIndex].quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image_url: product.image_url,
      category_name: product.category_name || '',
      quantity: quantity
    });
  }

  saveCart(cart);
  renderCartDrawer();
  return cart;
}

export function updateQuantity(productId, quantity) {
  let cart = getCart();
  const target = cart.find(item => item.id === productId);

  if (!target) return cart;

  if (quantity <= 0) {
    cart = cart.filter(item => item.id !== productId);
  } else {
    target.quantity = Math.min(99, quantity);
  }

  saveCart(cart);
  renderCartDrawer();
  return cart;
}

export function removeFromCart(productId) {
  let cart = getCart();
  cart = cart.filter(item => item.id !== productId);
  saveCart(cart);
  renderCartDrawer();
  return cart;
}

export function clearCart() {
  saveCart([]);
  renderCartDrawer();
}

export function getCartTotals() {
  const cart = getCart();
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  let deliveryFee = 0;
  if (subtotal > 0) {
    deliveryFee = subtotal >= APP_CONFIG.freeDeliveryThreshold ? 0.00 : APP_CONFIG.deliveryFeeStandard;
  }

  const tax = Number((subtotal * APP_CONFIG.taxRate).toFixed(2));
  const total = Number((subtotal + deliveryFee + tax).toFixed(2));

  return {
    itemCount,
    subtotal: Number(subtotal.toFixed(2)),
    deliveryFee: Number(deliveryFee.toFixed(2)),
    tax,
    total,
    isFreeDelivery: subtotal >= APP_CONFIG.freeDeliveryThreshold && subtotal > 0,
    amountUntilFreeDelivery: Math.max(0, Number((APP_CONFIG.freeDeliveryThreshold - subtotal).toFixed(2)))
  };
}

export function updateCartBadges() {
  const { itemCount } = getCartTotals();
  const badges = document.querySelectorAll('.cart-badge-count');
  badges.forEach(badge => {
    badge.textContent = itemCount;
    badge.style.display = itemCount > 0 ? 'flex' : 'none';
  });
}

export function openCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  const backdrop = document.getElementById('cartBackdrop');
  if (drawer) drawer.classList.add('open');
  if (backdrop) backdrop.classList.add('active');
  renderCartDrawer();
}

export function closeCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  const backdrop = document.getElementById('cartBackdrop');
  if (drawer) drawer.classList.remove('open');
  if (backdrop) backdrop.classList.remove('active');
}

export function renderCartDrawer() {
  const listEl = document.getElementById('cartDrawerItems');
  const footerEl = document.getElementById('cartDrawerFooter');
  if (!listEl) return;

  const cart = getCart();
  const totals = getCartTotals();

  if (cart.length === 0) {
    listEl.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="8" cy="21" r="1"></circle>
            <circle cx="19" cy="21" r="1"></circle>
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path>
          </svg>
        </div>
        <h4>Your bag is empty</h4>
        <p class="text-sm text-muted">Looks like you haven't added any cravers yet. Explore our delicious menu!</p>
        <a href="menu.html" class="btn btn-primary btn-sm" onclick="window.LaVIDACart.closeDrawer()">Explore Menu</a>
      </div>
    `;
    if (footerEl) footerEl.style.display = 'none';
    return;
  }

  if (footerEl) footerEl.style.display = 'flex';

  listEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200'}" alt="${item.name}" class="cart-item-img">
      <div class="cart-item-details">
        <div class="flex justify-between items-center">
          <span class="cart-item-title">${item.name}</span>
          <button class="cart-item-remove" onclick="window.LaVIDACart.remove('${item.id}')" title="Remove item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="flex justify-between items-center" style="margin-top: 8px;">
          <span class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</span>
          <div class="cart-quantity-controls">
            <button class="qty-btn" onclick="window.LaVIDACart.updateQty('${item.id}', ${item.quantity - 1})" aria-label="Decrease quantity">−</button>
            <span class="qty-count">${item.quantity}</span>
            <button class="qty-btn" onclick="window.LaVIDACart.updateQty('${item.id}', ${item.quantity + 1})" aria-label="Increase quantity">+</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  if (footerEl) {
    footerEl.innerHTML = `
      ${totals.amountUntilFreeDelivery > 0 ? `
        <div style="background: var(--color-secondary-light); padding: 6px 12px; border-radius: var(--radius-md); font-size: 0.75rem; color: var(--color-secondary-hover); font-weight: 700; text-align: center;">
          🔥 Add $${totals.amountUntilFreeDelivery.toFixed(2)} more for FREE Delivery!
        </div>
      ` : `
        <div style="background: var(--color-success-bg); padding: 6px 12px; border-radius: var(--radius-md); font-size: 0.75rem; color: var(--color-success); font-weight: 700; text-align: center;">
          🎉 You unlocked FREE Delivery!
        </div>
      `}
      <div class="cart-summary-row">
        <span>Subtotal</span>
        <span>$${totals.subtotal.toFixed(2)}</span>
      </div>
      <div class="cart-summary-row">
        <span>Delivery Fee</span>
        <span>${totals.deliveryFee === 0 ? '<strong class="text-success">FREE</strong>' : `$${totals.deliveryFee.toFixed(2)}`}</span>
      </div>
      <div class="cart-summary-row">
        <span>Estimated Tax (8%)</span>
        <span>$${totals.tax.toFixed(2)}</span>
      </div>
      <div class="cart-summary-row cart-summary-total">
        <span>Estimated Total</span>
        <span>$${totals.total.toFixed(2)}</span>
      </div>
      <a href="checkout.html" class="btn btn-primary btn-lg" style="width: 100%; margin-top: 8px;" onclick="window.LaVIDACart.closeDrawer()">
        Proceed to Checkout →
      </a>
    `;
  }
}

// Attach globally for inline HTML event handlers
window.LaVIDACart = {
  get: getCart,
  add: addToCart,
  updateQty: updateQuantity,
  remove: removeFromCart,
  clear: clearCart,
  getTotals: getCartTotals,
  openDrawer: openCartDrawer,
  closeDrawer: closeCartDrawer
};

// Auto initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadges();
  renderCartDrawer();

  // Backdrop click listener
  const backdrop = document.getElementById('cartBackdrop');
  if (backdrop) {
    backdrop.addEventListener('click', closeCartDrawer);
  }
});
