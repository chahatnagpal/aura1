/* ==============================================================================
   LaVIDA — Admin Dashboard Logic
   Full CRUD for Products, Categories, Order Management & KPI Metrics
   ============================================================================== */

import { requireAdmin, getCurrentUser } from './auth.js';
import { getProducts, getCategories, createProduct, updateProduct, deleteProduct, toggleProductAvailability, createCategory, updateCategory, deleteCategory } from './products.js';
import { getAllOrders, updateOrderStatus } from './orders.js';
import { uploadProductImage } from './storage.js';
import { showToast, openModal, closeModal } from './ui.js';

let currentAdminTab = 'overview';
let cachedProducts = [];
let cachedCategories = [];
let cachedOrders = [];

export async function initAdminDashboard() {
  const adminUser = await requireAdmin('auth.html');
  if (!adminUser) return;

  // Set admin name in header
  const adminNameEl = document.getElementById('adminUserName');
  if (adminNameEl) {
    adminNameEl.textContent = adminUser.profile?.full_name || adminUser.email;
  }

  setupAdminTabs();
  await loadAllAdminData();
  renderCurrentTab();
  setupEventListeners();
}

async function loadAllAdminData() {
  try {
    const [products, categories, orders] = await Promise.all([
      getProducts({}),
      getCategories(),
      getAllOrders({})
    ]);

    cachedProducts = products;
    cachedCategories = categories;
    cachedOrders = orders;
  } catch (err) {
    console.error('Error loading admin data:', err);
    showToast('Failed to load some dashboard data: ' + err.message, 'danger');
  }
}

function setupAdminTabs() {
  const tabButtons = document.querySelectorAll('.admin-nav-item');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.getAttribute('data-tab');
      currentAdminTab = targetTab;
      renderCurrentTab();
    });
  });
}

function renderCurrentTab() {
  const container = document.getElementById('adminContentView');
  if (!container) return;

  if (currentAdminTab === 'overview') {
    renderOverviewTab(container);
  } else if (currentAdminTab === 'products') {
    renderProductsTab(container);
  } else if (currentAdminTab === 'categories') {
    renderCategoriesTab(container);
  } else if (currentAdminTab === 'orders') {
    renderOrdersTab(container);
  }
}

/* ------------------------------------------------------------------------------
   1. OVERVIEW TAB & KPIS
   ------------------------------------------------------------------------------ */
function renderOverviewTab(container) {
  const totalRevenue = cachedOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  const pendingOrders = cachedOrders.filter(o => o.status === 'pending' || o.status === 'preparing');
  const deliveredOrders = cachedOrders.filter(o => o.status === 'delivered');
  const availableProducts = cachedProducts.filter(p => p.available);

  container.innerHTML = `
    <!-- KPI Summary Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-card-info">
          <span class="stat-card-title">Total Revenue</span>
          <span class="stat-card-value">$${totalRevenue.toFixed(2)}</span>
          <span class="text-xs text-muted">${cachedOrders.length} Lifetime Orders</span>
        </div>
        <div class="stat-card-icon success">💰</div>
      </div>

      <div class="stat-card">
        <div class="stat-card-info">
          <span class="stat-card-title">Active Orders</span>
          <span class="stat-card-value">${pendingOrders.length}</span>
          <span class="text-xs" style="color:var(--color-primary); font-weight:700;">Needs Fulfillment</span>
        </div>
        <div class="stat-card-icon primary">🔥</div>
      </div>

      <div class="stat-card">
        <div class="stat-card-info">
          <span class="stat-card-title">Delivered Orders</span>
          <span class="stat-card-value">${deliveredOrders.length}</span>
          <span class="text-xs text-muted">Completed successfully</span>
        </div>
        <div class="stat-card-icon info">✅</div>
      </div>

      <div class="stat-card">
        <div class="stat-card-info">
          <span class="stat-card-title">Menu Items</span>
          <span class="stat-card-value">${cachedProducts.length}</span>
          <span class="text-xs text-muted">${availableProducts.length} Available Live</span>
        </div>
        <div class="stat-card-icon secondary">🍔</div>
      </div>
    </div>

    <!-- Recent Orders & Products Section -->
    <div style="display:grid; grid-template-columns: 1.4fr 1fr; gap: 24px;">
      <div class="admin-card">
        <div class="admin-card-header">
          <h3 style="font-size:1.1rem;">Recent Orders</h3>
          <button class="btn btn-outline btn-sm" onclick="window.LaVIDAAdmin.switchTab('orders')">View All</button>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${cachedOrders.slice(0, 5).map(o => `
                <tr>
                  <td><strong>#${o.id.substring(0, 8)}</strong></td>
                  <td>${o.customer_name}</td>
                  <td>$${Number(o.total).toFixed(2)}</td>
                  <td><span class="status-pill status-${o.status}">${o.status.replace('_', ' ')}</span></td>
                </tr>
              `).join('') || '<tr><td colspan="4" class="text-center text-muted">No orders yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <div class="admin-card">
        <div class="admin-card-header">
          <h3 style="font-size:1.1rem;">Menu Highlights</h3>
          <button class="btn btn-outline btn-sm" onclick="window.LaVIDAAdmin.switchTab('products')">Manage Menu</button>
        </div>
        <div style="padding: 16px; display:flex; flex-direction:column; gap:12px;">
          ${cachedProducts.slice(0, 4).map(p => `
            <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding-bottom:8px; border-bottom:1px solid var(--color-light-200);">
              <div style="display:flex; align-items:center; gap:10px;">
                <img src="${p.image_url}" style="width:36px; height:36px; border-radius:8px; object-fit:cover;">
                <div>
                  <div style="font-size:0.85rem; font-weight:700;">${p.name}</div>
                  <div style="font-size:0.75rem; color:var(--text-muted);">$${Number(p.price).toFixed(2)}</div>
                </div>
              </div>
              <span class="badge ${p.available ? 'badge-success' : 'badge-danger'}">${p.available ? 'In Stock' : 'Sold Out'}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

/* ------------------------------------------------------------------------------
   2. PRODUCTS MANAGEMENT TAB (CRUD)
   ------------------------------------------------------------------------------ */
function renderProductsTab(container) {
  container.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-header">
        <div>
          <h3 style="font-size:1.25rem;">Products Catalog</h3>
          <p class="text-xs text-muted">Manage items, pricing, availability and featured showcases</p>
        </div>
        <button class="btn btn-primary btn-sm" id="btnOpenAddProduct">
          + Add New Product
        </button>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Featured</th>
              <th>Status</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${cachedProducts.map(p => `
              <tr>
                <td><img src="${p.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'}" class="table-product-thumb" alt="${p.name}"></td>
                <td>
                  <div style="font-weight:700;">${p.name}</div>
                  <div style="font-size:0.75rem; color:var(--text-muted); max-width:280px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.description || ''}</div>
                </td>
                <td><span class="badge badge-secondary">${p.category_name || 'Specialty'}</span></td>
                <td><strong>$${Number(p.price).toFixed(2)}</strong></td>
                <td>${p.featured ? '<span class="badge badge-primary">★ Featured</span>' : '<span class="text-muted text-xs">—</span>'}</td>
                <td>
                  <button class="badge ${p.available ? 'badge-success' : 'badge-danger'}" onclick="window.LaVIDAAdmin.toggleAvailability('${p.id}', ${!p.available})">
                    ${p.available ? '● In Stock' : '○ Out of Stock'}
                  </button>
                </td>
                <td style="text-align:right;">
                  <button class="btn btn-outline btn-sm" onclick="window.LaVIDAAdmin.openEditProduct('${p.id}')">Edit</button>
                  <button class="btn btn-dark btn-sm" style="background:#EF4444; color:white;" onclick="window.LaVIDAAdmin.confirmDeleteProduct('${p.id}', '${p.name.replace(/'/g, "\\'")}')">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btnOpenAddProduct')?.addEventListener('click', () => {
    openProductFormModal();
  });
}

/* ------------------------------------------------------------------------------
   3. CATEGORIES MANAGEMENT TAB (CRUD)
   ------------------------------------------------------------------------------ */
function renderCategoriesTab(container) {
  container.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-header">
        <div>
          <h3 style="font-size:1.25rem;">Categories Management</h3>
          <p class="text-xs text-muted">Organize menu groupings and hero showcases</p>
        </div>
        <button class="btn btn-primary btn-sm" id="btnOpenAddCategory">
          + Add Category
        </button>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Category Name</th>
              <th>Description</th>
              <th>Total Products</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${cachedCategories.map(cat => {
              const count = cachedProducts.filter(p => p.category_id === cat.id).length;
              return `
                <tr>
                  <td><img src="${cat.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100'}" class="table-product-thumb" alt="${cat.name}"></td>
                  <td><strong>${cat.name}</strong></td>
                  <td><span class="text-muted text-xs">${cat.description || '—'}</span></td>
                  <td><span class="badge badge-info">${count} items</span></td>
                  <td style="text-align:right;">
                    <button class="btn btn-outline btn-sm" onclick="window.LaVIDAAdmin.openEditCategory('${cat.id}')">Edit</button>
                    <button class="btn btn-dark btn-sm" style="background:#EF4444; color:white;" onclick="window.LaVIDAAdmin.confirmDeleteCategory('${cat.id}', '${cat.name.replace(/'/g, "\\'")}')">Delete</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btnOpenAddCategory')?.addEventListener('click', () => {
    openCategoryFormModal();
  });
}

/* ------------------------------------------------------------------------------
   4. ORDERS MANAGEMENT TAB (STATUS WORKFLOW)
   ------------------------------------------------------------------------------ */
function renderOrdersTab(container) {
  container.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-header">
        <div>
          <h3 style="font-size:1.25rem;">Live Orders Queue</h3>
          <p class="text-xs text-muted">Track, fulfill, and update live customer orders</p>
        </div>
        <div style="display:flex; gap:12px; align-items:center;">
          <select id="adminOrderFilterStatus" class="form-select" style="width:160px; padding:6px 12px; font-size:0.8rem;">
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Address</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th style="text-align:right;">Action</th>
            </tr>
          </thead>
          <tbody id="adminOrdersTableBody">
            ${renderOrdersTableRows(cachedOrders)}
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('adminOrderFilterStatus')?.addEventListener('change', (e) => {
    const val = e.target.value;
    const filtered = val === 'all' ? cachedOrders : cachedOrders.filter(o => o.status === val);
    const tbody = document.getElementById('adminOrdersTableBody');
    if (tbody) tbody.innerHTML = renderOrdersTableRows(filtered);
  });
}

function renderOrdersTableRows(orders) {
  if (!orders || orders.length === 0) {
    return '<tr><td colspan="7" class="text-center text-muted" style="padding:24px;">No orders found.</td></tr>';
  }

  return orders.map(o => `
    <tr>
      <td><strong>#${o.id.substring(0, 8)}</strong><br><span class="text-xs text-muted">${new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></td>
      <td>
        <div style="font-weight:700;">${o.customer_name}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">${o.customer_phone}</div>
      </td>
      <td><span class="text-xs" style="max-width:200px; display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${o.delivery_address}</span></td>
      <td><strong>$${Number(o.total).toFixed(2)}</strong></td>
      <td><span class="badge badge-secondary text-xs">${o.payment_method}</span></td>
      <td><span class="status-pill status-${o.status}">${o.status.replace('_', ' ')}</span></td>
      <td style="text-align:right;">
        <button class="btn btn-primary btn-sm" onclick="window.LaVIDAAdmin.openOrderDetails('${o.id}')">Manage</button>
      </td>
    </tr>
  `).join('');
}

/* ------------------------------------------------------------------------------
   5. PRODUCT MODAL (CREATE / EDIT)
   ------------------------------------------------------------------------------ */
function openProductFormModal(productId = null) {
  const existing = productId ? cachedProducts.find(p => p.id === productId) : null;
  const isEdit = Boolean(existing);

  const modalHtml = `
    <div class="modal-overlay active" id="productModal">
      <div class="modal-container">
        <div class="modal-header">
          <h3>${isEdit ? 'Edit Product' : 'Add New Product'}</h3>
          <button class="btn-icon" onclick="window.LaVIDAUI.closeModal('productModal')">✕</button>
        </div>
        <div class="modal-body">
          <form id="productForm">
            <div class="form-group">
              <label class="form-label" for="prodName">Product Title *</label>
              <input type="text" id="prodName" class="form-input" value="${existing?.name || ''}" placeholder="e.g. Truffle Umami Smash Burger" required>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
              <div class="form-group">
                <label class="form-label" for="prodCategory">Category *</label>
                <select id="prodCategory" class="form-select" required>
                  ${cachedCategories.map(c => `
                    <option value="${c.id}" ${existing?.category_id === c.id ? 'selected' : ''}>${c.name}</option>
                  `).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="prodPrice">Price ($) *</label>
                <input type="number" step="0.01" id="prodPrice" class="form-input" value="${existing?.price || ''}" placeholder="12.99" required>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="prodDesc">Description</label>
              <textarea id="prodDesc" class="form-textarea" rows="3" placeholder="Describe the ingredients, cooking method and flavors...">${existing?.description || ''}</textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Product Image</label>
              <div class="image-upload-dropzone" id="productImageDropzone">
                <p class="text-sm">Drag & drop an image or <strong>click to browse</strong> (Max 5MB)</p>
                <input type="file" id="prodImageFileInput" accept="image/*" style="display:none;">
              </div>
              <div class="form-group" style="margin-top:8px;">
                <input type="url" id="prodImageUrl" class="form-input" value="${existing?.image_url || ''}" placeholder="Or paste direct image URL (https://...)">
              </div>
              <div class="image-preview-box" id="prodImagePreview">
                <img src="${existing?.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600'}" alt="Preview">
              </div>
            </div>

            <div style="display:flex; gap:24px; margin-top:16px;">
              <label style="display:flex; align-items:center; gap:8px; font-weight:600; font-size:0.9rem; cursor:pointer;">
                <input type="checkbox" id="prodAvailable" ${existing ? (existing.available ? 'checked' : '') : 'checked'}>
                Available Live for Orders
              </label>
              <label style="display:flex; align-items:center; gap:8px; font-weight:600; font-size:0.9rem; cursor:pointer;">
                <input type="checkbox" id="prodFeatured" ${existing?.featured ? 'checked' : ''}>
                Showcase on Homepage (Featured)
              </label>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline btn-sm" onclick="window.LaVIDAUI.closeModal('productModal')">Cancel</button>
          <button type="button" class="btn btn-primary btn-sm" id="btnSaveProduct">${isEdit ? 'Save Changes' : 'Create Product'}</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('productModal')?.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Wire dropzone & upload
  const dropzone = document.getElementById('productImageDropzone');
  const fileInput = document.getElementById('prodImageFileInput');
  const urlInput = document.getElementById('prodImageUrl');
  const previewImg = document.querySelector('#prodImagePreview img');

  dropzone?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        showToast('Uploading image to Supabase Storage...', 'info');
        const uploadedUrl = await uploadProductImage(file);
        urlInput.value = uploadedUrl;
        previewImg.src = uploadedUrl;
        showToast('Image uploaded successfully!', 'success');
      } catch (err) {
        showToast(err.message, 'danger');
      }
    }
  });

  urlInput?.addEventListener('input', (e) => {
    if (e.target.value.trim()) previewImg.src = e.target.value.trim();
  });

  // Save handler
  document.getElementById('btnSaveProduct')?.addEventListener('click', async () => {
    const name = document.getElementById('prodName').value.trim();
    const category_id = document.getElementById('prodCategory').value;
    const price = parseFloat(document.getElementById('prodPrice').value);
    const description = document.getElementById('prodDesc').value.trim();
    const image_url = document.getElementById('prodImageUrl').value.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600';
    const available = document.getElementById('prodAvailable').checked;
    const featured = document.getElementById('prodFeatured').checked;

    if (!name || isNaN(price)) {
      showToast('Please enter a valid product name and price.', 'warning');
      return;
    }

    try {
      const payload = { name, category_id, price, description, image_url, available, featured };
      if (isEdit) {
        await updateProduct(productId, payload);
        showToast('Product updated successfully!', 'success');
      } else {
        await createProduct(payload);
        showToast('Product created successfully!', 'success');
      }
      closeModal('productModal');
      await loadAllAdminData();
      renderCurrentTab();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });
}

/* ------------------------------------------------------------------------------
   6. CATEGORY MODAL (CREATE / EDIT)
   ------------------------------------------------------------------------------ */
function openCategoryFormModal(categoryId = null) {
  const existing = categoryId ? cachedCategories.find(c => c.id === categoryId) : null;
  const isEdit = Boolean(existing);

  const modalHtml = `
    <div class="modal-overlay active" id="categoryModal">
      <div class="modal-container" style="max-width:480px;">
        <div class="modal-header">
          <h3>${isEdit ? 'Edit Category' : 'Add Category'}</h3>
          <button class="btn-icon" onclick="window.LaVIDAUI.closeModal('categoryModal')">✕</button>
        </div>
        <div class="modal-body">
          <form id="categoryForm">
            <div class="form-group">
              <label class="form-label" for="catName">Category Name *</label>
              <input type="text" id="catName" class="form-input" value="${existing?.name || ''}" placeholder="e.g. Gourmet Tacos" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="catDesc">Description</label>
              <textarea id="catDesc" class="form-textarea" rows="2" placeholder="Brief summary of items in this category">${existing?.description || ''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label" for="catImageUrl">Cover Image URL</label>
              <input type="url" id="catImageUrl" class="form-input" value="${existing?.image_url || ''}" placeholder="https://images.unsplash.com/...">
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline btn-sm" onclick="window.LaVIDAUI.closeModal('categoryModal')">Cancel</button>
          <button type="button" class="btn btn-primary btn-sm" id="btnSaveCategory">${isEdit ? 'Save Category' : 'Create Category'}</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('categoryModal')?.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('btnSaveCategory')?.addEventListener('click', async () => {
    const name = document.getElementById('catName').value.trim();
    const description = document.getElementById('catDesc').value.trim();
    const image_url = document.getElementById('catImageUrl').value.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600';

    if (!name) {
      showToast('Please enter a category name.', 'warning');
      return;
    }

    try {
      if (isEdit) {
        await updateCategory(categoryId, { name, description, image_url });
        showToast('Category updated!', 'success');
      } else {
        await createCategory({ name, description, image_url });
        showToast('Category created!', 'success');
      }
      closeModal('categoryModal');
      await loadAllAdminData();
      renderCurrentTab();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });
}

/* ------------------------------------------------------------------------------
   7. ORDER DETAILS & STATUS UPDATE MODAL
   ------------------------------------------------------------------------------ */
function openOrderDetailsModal(orderId) {
  const order = cachedOrders.find(o => o.id === orderId);
  if (!order) return;

  const modalHtml = `
    <div class="modal-overlay active" id="orderManageModal">
      <div class="modal-container" style="max-width:600px;">
        <div class="modal-header">
          <div>
            <h3>Order #${order.id.substring(0, 8)}</h3>
            <span class="text-xs text-muted">Placed on ${new Date(order.created_at).toLocaleString()}</span>
          </div>
          <button class="btn-icon" onclick="window.LaVIDAUI.closeModal('orderManageModal')">✕</button>
        </div>
        <div class="modal-body">
          <div style="background:var(--color-light-100); padding:16px; border-radius:var(--radius-lg); margin-bottom:20px; border:1px solid var(--color-light-200);">
            <div style="font-size:0.85rem; font-weight:700; margin-bottom:6px;">Customer Details:</div>
            <div><strong>${order.customer_name}</strong> (${order.customer_phone})</div>
            <div class="text-sm text-muted" style="margin-top:4px;">📍 ${order.delivery_address}</div>
            ${order.delivery_instructions ? `<div class="text-xs text-muted" style="margin-top:4px;">📝 Note: <em>${order.delivery_instructions}</em></div>` : ''}
          </div>

          <div style="font-size:0.85rem; font-weight:700; margin-bottom:8px;">Ordered Items:</div>
          <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px;">
            ${(order.items || []).map(item => `
              <div style="display:flex; justify-content:space-between; font-size:0.85rem; padding-bottom:6px; border-bottom:1px solid var(--color-light-200);">
                <span>${item.quantity}x ${item.product_name}</span>
                <strong>$${Number(item.subtotal || item.unit_price * item.quantity).toFixed(2)}</strong>
              </div>
            `).join('')}
          </div>

          <div style="display:flex; justify-content:space-between; font-size:0.95rem; font-weight:800; padding:8px 0; border-top:1px dashed var(--color-light-300);">
            <span>Total (${order.payment_method}):</span>
            <span style="color:var(--color-primary);">$${Number(order.total).toFixed(2)}</span>
          </div>

          <div class="form-group" style="margin-top:20px;">
            <label class="form-label">Update Order Fulfillment Status:</label>
            <select id="modalOrderStatusSelect" class="form-select" style="font-weight:700;">
              <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>⏳ Pending (New Order)</option>
              <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>📋 Confirmed (Kitchen Accepted)</option>
              <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>🍳 Preparing in Kitchen</option>
              <option value="out_for_delivery" ${order.status === 'out_for_delivery' ? 'selected' : ''}>🛵 Out for Delivery</option>
              <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>✅ Delivered</option>
              <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline btn-sm" onclick="window.LaVIDAUI.closeModal('orderManageModal')">Close</button>
          <button type="button" class="btn btn-primary btn-sm" id="btnUpdateOrderStatus">Update Status</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('orderManageModal')?.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('btnUpdateOrderStatus')?.addEventListener('click', async () => {
    const newStatus = document.getElementById('modalOrderStatusSelect').value;
    try {
      await updateOrderStatus(orderId, newStatus);
      showToast(`Order status updated to "${newStatus.replace('_', ' ')}"`, 'success');
      closeModal('orderManageModal');
      await loadAllAdminData();
      renderCurrentTab();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });
}

function setupEventListeners() {
  // Global admin namespace for event bindings
  window.LaVIDAAdmin = {
    switchTab: (tab) => {
      document.querySelectorAll('.admin-nav-item').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-tab') === tab);
      });
      currentAdminTab = tab;
      renderCurrentTab();
    },
    toggleAvailability: async (id, available) => {
      try {
        await toggleProductAvailability(id, available);
        showToast(`Product availability updated to ${available ? 'In Stock' : 'Out of Stock'}.`, 'info');
        await loadAllAdminData();
        renderCurrentTab();
      } catch (err) {
        showToast(err.message, 'danger');
      }
    },
    openEditProduct: (id) => openProductFormModal(id),
    confirmDeleteProduct: async (id, name) => {
      if (confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
        try {
          await deleteProduct(id);
          showToast(`Deleted "${name}".`, 'info');
          await loadAllAdminData();
          renderCurrentTab();
        } catch (err) {
          showToast(err.message, 'danger');
        }
      }
    },
    openEditCategory: (id) => openCategoryFormModal(id),
    confirmDeleteCategory: async (id, name) => {
      if (confirm(`Are you sure you want to delete category "${name}"?`)) {
        try {
          await deleteCategory(id);
          showToast(`Deleted category "${name}".`, 'info');
          await loadAllAdminData();
          renderCurrentTab();
        } catch (err) {
          showToast(err.message, 'danger');
        }
      }
    },
    openOrderDetails: (id) => openOrderDetailsModal(id)
  };
}
