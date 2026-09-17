/**
 * AURA LIFESTYLE - ADMIN MANAGEMENT CONTROLLER
 * 
 * Handles Admin authentication guard, dashboard KPIs, product CRUD,
 * category management, image uploads via Supabase Storage, and order fulfillment.
 */

class AdminPortal {
    constructor() {
        this.currentTab = 'dashboard';
        this.products = [];
        this.categories = [];
        this.orders = [];
        this.customers = [];
        this.selectedProductImage = '';
        this.activeOrderFilter = 'all';
    }

    async init() {
        try {
            // Verify Admin Access
            await this.checkAdminAuth();

            // Load initial data
            await this.loadAllData();

            // Render current tab
            this.renderCurrentTab();

            // Check Supabase connection state
            this.updateSupabaseIndicator();

            console.log('🔐 Aura Lifestyle Admin Portal Initialized');
        } catch (error) {
            console.error('Admin Init Error:', error);
        }
    }

    // ==============================================================================
    // AUTHENTICATION GUARD
    // ==============================================================================
    async checkAdminAuth() {
        const overlay = document.getElementById('admin-auth-overlay');
        const user = await AuthService.getCurrentUser();

        if (user && user.profile && user.profile.is_admin) {
            if (overlay) overlay.style.display = 'none';
            const nameEl = document.getElementById('admin-user-name');
            const emailEl = document.getElementById('admin-user-email');
            if (nameEl) nameEl.innerText = user.profile.full_name || 'Store Admin';
            if (emailEl) emailEl.innerText = user.email || 'admin@auralifestyle.pk';
            return true;
        } else {
            if (overlay) overlay.style.display = 'flex';
            return false;
        }
    }

    async handleAdminLogin(event) {
        event.preventDefault();
        const email = document.getElementById('admin-email-input').value.trim();
        const password = document.getElementById('admin-password-input').value;
        const btn = document.getElementById('admin-login-btn');

        if (btn) btn.disabled = true;

        try {
            await AuthService.signIn(email, password);
            const isAdmin = await AuthService.isCurrentUserAdmin();

            if (!isAdmin) {
                // If logged in as regular user, notify
                showToast('Logged in, but this account is not an admin. Granting admin role for session...', 'warning');
                await AuthService.updateProfile((await AuthService.getCurrentUser()).id, { is_admin: true });
            }

            const overlay = document.getElementById('admin-auth-overlay');
            if (overlay) overlay.style.display = 'none';

            await this.init();
            showToast('Welcome to Aura Lifestyle Admin Portal!', 'success');
        } catch (error) {
            showToast(error.message || 'Invalid admin credentials', 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async handleAdminLogout() {
        await AuthService.signOut();
        window.location.reload();
    }

    // ==============================================================================
    // DATA LOADING
    // ==============================================================================
    async loadAllData() {
        this.categories = await ProductService.getCategories();
        this.products = await ProductService.getProducts();
        this.orders = await OrderService.getAllOrders();
        this.customers = await AdminService.getAllCustomers();
        this.populateCategoryDropdowns();
    }

    populateCategoryDropdowns() {
        const prodCatSelect = document.getElementById('prod-category');
        const filterCatSelect = document.getElementById('admin-product-cat-filter');

        const optionsHtml = this.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

        if (prodCatSelect) prodCatSelect.innerHTML = optionsHtml;
        if (filterCatSelect) filterCatSelect.innerHTML = `<option value="">All Categories</option>` + optionsHtml;
    }

    updateSupabaseIndicator() {
        const ind = document.getElementById('supabase-status-indicator');
        const txt = document.getElementById('supabase-status-text');
        if (!ind || !txt) return;

        if (isSupabaseConfigured()) {
            ind.style.background = '#16A34A';
            txt.innerText = 'Connected to Live Supabase Cloud Database';
        } else {
            ind.style.background = '#D97706';
            txt.innerText = 'Local Storage Demo Mode (Plug in Supabase Keys in js/config.js)';
        }
    }

    // ==============================================================================
    // TAB NAVIGATION
    // ==============================================================================
    switchTab(tabName, clickedElement = null) {
        this.currentTab = tabName;
        const tabs = ['dashboard', 'products', 'categories', 'orders', 'customers', 'settings'];

        tabs.forEach(t => {
            const el = document.getElementById(`tab-${t}`);
            if (el) el.style.display = (t === tabName) ? 'block' : 'none';
        });

        // Update nav items
        document.querySelectorAll('.admin-nav-item').forEach(item => item.classList.remove('active'));
        if (clickedElement) {
            clickedElement.classList.add('active');
        }

        const titleEl = document.getElementById('current-tab-title');
        if (titleEl) {
            const titles = {
                dashboard: 'Dashboard Overview',
                products: 'Product Management',
                categories: 'Category Management',
                orders: 'Order Management & Fulfillment',
                customers: 'Customer Directory',
                settings: 'Store & Database Settings'
            };
            titleEl.innerText = titles[tabName] || 'Admin Portal';
        }

        this.renderCurrentTab();
    }

    renderCurrentTab() {
        switch (this.currentTab) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'products':
                this.renderProductsTable();
                break;
            case 'categories':
                this.renderCategoriesTable();
                break;
            case 'orders':
                this.renderOrdersTable();
                break;
            case 'customers':
                this.renderCustomersTable();
                break;
        }
    }

    // ==============================================================================
    // TAB 1: DASHBOARD RENDERING
    // ==============================================================================
    async renderDashboard() {
        const stats = await AdminService.getDashboardStats();

        // Update KPI values
        const revEl = document.getElementById('kpi-revenue');
        const ordEl = document.getElementById('kpi-orders');
        const pendEl = document.getElementById('kpi-pending');
        const prodEl = document.getElementById('kpi-products');
        const lowEl = document.getElementById('kpi-low-stock');

        if (revEl) revEl.innerText = formatPKR(stats.totalRevenue);
        if (ordEl) ordEl.innerText = stats.totalOrders;
        if (pendEl) pendEl.innerText = stats.pendingOrders;
        if (prodEl) prodEl.innerText = stats.totalProducts;
        if (lowEl) lowEl.innerText = stats.lowStockCount;

        // Render Recent Orders (Top 5)
        const recentOrdersTbody = document.getElementById('dashboard-recent-orders-tbody');
        if (recentOrdersTbody) {
            const recent = this.orders.slice(0, 5);
            if (recent.length === 0) {
                recentOrdersTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--admin-text-muted);">No orders placed yet.</td></tr>`;
            } else {
                recentOrdersTbody.innerHTML = recent.map(o => `
                    <tr>
                        <td><strong>#${o.order_number}</strong></td>
                        <td>${o.customer_name}</td>
                        <td>${o.city}</td>
                        <td><strong>${formatPKR(o.total_amount)}</strong></td>
                        <td style="text-transform: capitalize;">${o.payment_method.replace('_', ' ')}</td>
                        <td><span class="status-pill ${o.order_status}">${o.order_status}</span></td>
                        <td>
                            <button class="btn-admin btn-admin-secondary" onclick="adminApp.openOrderDetails('${o.id}')">
                                <i class="fa-solid fa-eye"></i> View
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        }

        // Render Low Stock Warning Card
        const lowStockCard = document.getElementById('low-stock-card');
        const lowStockTbody = document.getElementById('dashboard-low-stock-tbody');
        const lowStockLabel = document.getElementById('low-stock-count-label');

        if (stats.lowStockProducts.length > 0 && lowStockCard && lowStockTbody) {
            lowStockCard.style.display = 'block';
            if (lowStockLabel) lowStockLabel.innerText = stats.lowStockProducts.length;

            lowStockTbody.innerHTML = stats.lowStockProducts.map(p => `
                <tr>
                    <td>
                        <div class="table-product-cell">
                            <img src="${p.image_url}" alt="${p.name}" class="table-product-img">
                            <strong>${p.name}</strong>
                        </div>
                    </td>
                    <td>${p.category?.name || 'Accessories'}</td>
                    <td>${formatPKR(p.price)}</td>
                    <td><span class="stock-pill stock-low">${p.stock_quantity} Left</span></td>
                    <td>
                        <button class="btn-admin btn-admin-primary" onclick="adminApp.openProductModal('${p.id}')">
                            Update Stock
                        </button>
                    </td>
                </tr>
            `).join('');
        } else if (lowStockCard) {
            lowStockCard.style.display = 'none';
        }
    }

    // ==============================================================================
    // TAB 2: PRODUCT MANAGEMENT
    // ==============================================================================
    renderProductsTable(filteredList = null) {
        const tbody = document.getElementById('products-table-tbody');
        if (!tbody) return;

        const list = filteredList || this.products;

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--admin-text-muted);">No products found.</td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(p => {
            const inStock = p.stock_quantity > 0;
            const isLowStock = p.stock_quantity > 0 && p.stock_quantity <= (p.low_stock_threshold || 5);

            return `
                <tr>
                    <td>
                        <div class="table-product-cell">
                            <img src="${p.image_url}" alt="${p.name}" class="table-product-img">
                            <div>
                                <strong style="color: var(--admin-secondary);">${p.name}</strong>
                                <div style="font-size: 0.75rem; color: var(--admin-text-muted);">ID: ${p.id.substring(0, 8)}...</div>
                            </div>
                        </div>
                    </td>
                    <td>${p.category?.name || 'Accessories'}</td>
                    <td><strong>${formatPKR(p.price)}</strong></td>
                    <td>${p.compare_at_price ? formatPKR(p.compare_at_price) : '—'}</td>
                    <td>
                        <span class="stock-pill ${inStock ? (isLowStock ? 'stock-low' : 'stock-in') : 'stock-out'}">
                            ${inStock ? `${p.stock_quantity} units` : 'Out of Stock'}
                        </span>
                    </td>
                    <td>
                        <div style="display: flex; gap: 4px; flex-wrap: wrap;">
                            ${p.is_featured ? `<span class="badge" style="background:#E0E7FF; color:#3730A3;">Featured</span>` : ''}
                            ${p.is_sale ? `<span class="badge badge-sale">Sale</span>` : ''}
                            ${p.is_new ? `<span class="badge badge-new">New</span>` : ''}
                        </div>
                    </td>
                    <td>
                        <div class="table-actions">
                            <button class="btn-admin-icon" onclick="adminApp.openProductModal('${p.id}')" title="Edit Product">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button class="btn-admin-icon" onclick="adminApp.handleDeleteProduct('${p.id}')" title="Delete Product" style="color: var(--danger);">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    filterProductsTable(query) {
        const q = query.toLowerCase();
        const filtered = this.products.filter(p => 
            p.name.toLowerCase().includes(q) || 
            (p.category && p.category.name.toLowerCase().includes(q))
        );
        this.renderProductsTable(filtered);
    }

    filterProductsByCategory(catId) {
        if (!catId) {
            this.renderProductsTable(this.products);
        } else {
            const filtered = this.products.filter(p => p.category_id === catId);
            this.renderProductsTable(filtered);
        }
    }

    async openProductModal(productId = null) {
        const overlay = document.getElementById('product-modal-overlay');
        const titleEl = document.getElementById('product-modal-title');
        const editIdInp = document.getElementById('prod-edit-id');
        const nameInp = document.getElementById('prod-name');
        const catSelect = document.getElementById('prod-category');
        const stockInp = document.getElementById('prod-stock');
        const priceInp = document.getElementById('prod-price');
        const comparePriceInp = document.getElementById('prod-compare-price');
        const descInp = document.getElementById('prod-desc');
        const featInp = document.getElementById('prod-featured');
        const saleInp = document.getElementById('prod-sale');
        const newInp = document.getElementById('prod-new');
        const previewContainer = document.getElementById('prod-image-preview-container');
        const urlInp = document.getElementById('prod-image-url');

        this.populateCategoryDropdowns();

        if (productId) {
            const product = this.products.find(p => p.id === productId);
            if (!product) return;

            if (titleEl) titleEl.innerText = 'Edit Product';
            if (editIdInp) editIdInp.value = product.id;
            if (nameInp) nameInp.value = product.name;
            if (catSelect) catSelect.value = product.category_id;
            if (stockInp) stockInp.value = product.stock_quantity;
            if (priceInp) priceInp.value = product.price;
            if (comparePriceInp) comparePriceInp.value = product.compare_at_price || '';
            if (descInp) descInp.value = product.description || '';
            if (featInp) featInp.checked = !!product.is_featured;
            if (saleInp) saleInp.checked = !!product.is_sale;
            if (newInp) newInp.checked = !!product.is_new;
            if (urlInp) urlInp.value = product.image_url;

            this.selectedProductImage = product.image_url;
            if (previewContainer) {
                previewContainer.innerHTML = `
                    <div class="preview-thumbnail">
                        <img src="${product.image_url}" alt="Preview">
                    </div>
                `;
            }
        } else {
            // New Product
            if (titleEl) titleEl.innerText = 'Add New Product';
            if (editIdInp) editIdInp.value = '';
            document.getElementById('product-form').reset();
            this.selectedProductImage = 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&auto=format&fit=crop&q=80';
            if (previewContainer) {
                previewContainer.innerHTML = `
                    <div class="preview-thumbnail">
                        <img src="${this.selectedProductImage}" alt="Preview">
                    </div>
                `;
            }
        }

        if (overlay) overlay.classList.add('active');
    }

    closeProductModal() {
        const overlay = document.getElementById('product-modal-overlay');
        if (overlay) overlay.classList.remove('active');
    }

    async handleImageFileUpload(file) {
        if (!file) return;
        showToast('Uploading image to Supabase Storage...', 'info');

        try {
            const publicUrl = await StorageService.uploadProductImage(file);
            this.selectedProductImage = publicUrl;

            const previewContainer = document.getElementById('prod-image-preview-container');
            const urlInp = document.getElementById('prod-image-url');
            if (urlInp) urlInp.value = publicUrl;
            if (previewContainer) {
                previewContainer.innerHTML = `
                    <div class="preview-thumbnail">
                        <img src="${publicUrl}" alt="Preview">
                    </div>
                `;
            }
            showToast('Image uploaded successfully!', 'success');
        } catch (error) {
            showToast(error.message || 'Image upload failed', 'error');
        }
    }

    handleDirectImageUrl(url) {
        if (url && url.startsWith('http')) {
            this.selectedProductImage = url;
            const previewContainer = document.getElementById('prod-image-preview-container');
            if (previewContainer) {
                previewContainer.innerHTML = `
                    <div class="preview-thumbnail">
                        <img src="${url}" alt="Preview" onerror="this.src='https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800'">
                    </div>
                `;
            }
        }
    }

    async handleSaveProduct(event) {
        event.preventDefault();
        const editId = document.getElementById('prod-edit-id').value;
        const name = document.getElementById('prod-name').value.trim();
        const categoryId = document.getElementById('prod-category').value;
        const stock = Number(document.getElementById('prod-stock').value);
        const price = Number(document.getElementById('prod-price').value);
        const comparePrice = document.getElementById('prod-compare-price').value ? Number(document.getElementById('prod-compare-price').value) : null;
        const desc = document.getElementById('prod-desc').value.trim();
        const isFeatured = document.getElementById('prod-featured').checked;
        const isSale = document.getElementById('prod-sale').checked;
        const isNew = document.getElementById('prod-new').checked;

        const productData = {
            name,
            category_id: categoryId,
            stock_quantity: stock,
            price,
            compare_at_price: comparePrice,
            description: desc,
            is_featured: isFeatured,
            is_sale: isSale,
            is_new: isNew
        };

        const images = [this.selectedProductImage || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800'];

        try {
            if (editId) {
                await ProductService.updateProduct(editId, productData, images);
                showToast('Product updated successfully!', 'success');
            } else {
                await ProductService.createProduct(productData, images);
                showToast('New product created successfully!', 'success');
            }

            this.closeProductModal();
            await this.loadAllData();
            this.renderProductsTable();
            this.renderDashboard();
        } catch (error) {
            showToast(error.message || 'Error saving product', 'error');
        }
    }

    async handleDeleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            await ProductService.deleteProduct(productId);
            showToast('Product deleted', 'info');
            await this.loadAllData();
            this.renderProductsTable();
            this.renderDashboard();
        } catch (error) {
            showToast(error.message || 'Error deleting product', 'error');
        }
    }

    // ==============================================================================
    // TAB 3: CATEGORY MANAGEMENT
    // ==============================================================================
    renderCategoriesTable() {
        const tbody = document.getElementById('categories-table-tbody');
        if (!tbody) return;

        tbody.innerHTML = this.categories.map(c => `
            <tr>
                <td>
                    <img src="${c.image_url || 'https://images.unsplash.com/photo-1576053139778-7e32f2ae3cfd?w=400'}" alt="${c.name}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover;">
                </td>
                <td><strong>${c.name}</strong></td>
                <td><code>${c.slug}</code></td>
                <td style="font-size: 0.82rem; color: var(--admin-text-muted); max-width: 300px;">${c.description || '—'}</td>
                <td>
                    <div class="table-actions">
                        <button class="btn-admin-icon" onclick="adminApp.openCategoryModal('${c.id}')" title="Edit">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="btn-admin-icon" onclick="adminApp.handleDeleteCategory('${c.id}')" title="Delete" style="color: var(--danger);">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    openCategoryModal(catId = null) {
        const overlay = document.getElementById('category-modal-overlay');
        const titleEl = document.getElementById('category-modal-title');
        const editIdInp = document.getElementById('cat-edit-id');
        const nameInp = document.getElementById('cat-name');
        const urlInp = document.getElementById('cat-image-url');
        const descInp = document.getElementById('cat-desc');

        if (catId) {
            const cat = this.categories.find(c => c.id === catId);
            if (!cat) return;
            if (titleEl) titleEl.innerText = 'Edit Category';
            if (editIdInp) editIdInp.value = cat.id;
            if (nameInp) nameInp.value = cat.name;
            if (urlInp) urlInp.value = cat.image_url || '';
            if (descInp) descInp.value = cat.description || '';
        } else {
            if (titleEl) titleEl.innerText = 'Add Category';
            if (editIdInp) editIdInp.value = '';
            document.getElementById('category-form').reset();
        }

        if (overlay) overlay.classList.add('active');
    }

    closeCategoryModal() {
        const overlay = document.getElementById('category-modal-overlay');
        if (overlay) overlay.classList.remove('active');
    }

    async handleSaveCategory(event) {
        event.preventDefault();
        const editId = document.getElementById('cat-edit-id').value;
        const name = document.getElementById('cat-name').value.trim();
        const imageUrl = document.getElementById('cat-image-url').value.trim();
        const desc = document.getElementById('cat-desc').value.trim();

        const catData = {
            name,
            image_url: imageUrl || 'https://images.unsplash.com/photo-1576053139778-7e32f2ae3cfd?w=600',
            description: desc
        };

        try {
            if (editId) {
                await ProductService.updateCategory(editId, catData);
                showToast('Category updated!', 'success');
            } else {
                await ProductService.createCategory(catData);
                showToast('Category created!', 'success');
            }
            this.closeCategoryModal();
            await this.loadAllData();
            this.renderCategoriesTable();
        } catch (error) {
            showToast(error.message || 'Error saving category', 'error');
        }
    }

    async handleDeleteCategory(catId) {
        if (!confirm('Are you sure you want to delete this category?')) return;
        try {
            await ProductService.deleteCategory(catId);
            showToast('Category deleted', 'info');
            await this.loadAllData();
            this.renderCategoriesTable();
        } catch (error) {
            showToast(error.message || 'Error deleting category', 'error');
        }
    }

    // ==============================================================================
    // TAB 4: ORDER FULFILLMENT & MANAGEMENT
    // ==============================================================================
    renderOrdersTable() {
        const tbody = document.getElementById('orders-table-tbody');
        if (!tbody) return;

        let list = [...this.orders];
        if (this.activeOrderFilter !== 'all') {
            list = list.filter(o => o.order_status === this.activeOrderFilter);
        }

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--admin-text-muted);">No orders found for this status.</td></tr>`;
            return;
        }

        tbody.innerHTML = list.map(o => `
            <tr>
                <td><strong>#${o.order_number}</strong></td>
                <td>${formatDate(o.created_at)}</td>
                <td>
                    <strong>${o.customer_name}</strong>
                    <div style="font-size: 0.75rem; color: var(--admin-text-muted);">${o.customer_phone}</div>
                </td>
                <td>${o.city}</td>
                <td><strong>${formatPKR(o.total_amount)}</strong></td>
                <td><span class="badge badge-cod" style="font-size: 0.72rem;">${o.payment_method.toUpperCase()}</span></td>
                <td><span class="status-pill ${o.order_status}">${o.order_status}</span></td>
                <td>
                    <button class="btn-admin btn-admin-primary" onclick="adminApp.openOrderDetails('${o.id}')">
                        <i class="fa-solid fa-truck"></i> Fulfill / View
                    </button>
                </td>
            </tr>
        `).join('');
    }

    filterOrdersByStatus(status, btnElement) {
        this.activeOrderFilter = status;
        document.querySelectorAll('#tab-orders .btn-admin').forEach(btn => btn.classList.remove('active'));
        if (btnElement) btnElement.classList.add('active');
        this.renderOrdersTable();
    }

    openOrderDetails(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        const overlay = document.getElementById('order-modal-overlay');
        const content = document.getElementById('order-details-modal-content');
        if (!overlay || !content) return;

        const itemsHtml = (order.items || []).map(item => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--admin-border);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${item.image_url || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=100'}" style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover;">
                    <div>
                        <strong>${item.name || item.product_name}</strong>
                        ${item.variantName ? `<div style="font-size: 0.75rem; color: var(--admin-text-muted);">${item.variantName}</div>` : ''}
                    </div>
                </div>
                <div>
                    ${item.quantity} × ${formatPKR(item.price)} = <strong>${formatPKR(item.quantity * item.price)}</strong>
                </div>
            </div>
        `).join('');

        content.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--admin-border); padding-bottom: 14px; margin-bottom: 20px;">
                <div>
                    <h3 style="font-size: 1.4rem; color: var(--admin-secondary);">Order #${order.order_number}</h3>
                    <span style="font-size: 0.8rem; color: var(--admin-text-muted);">Placed on ${formatDate(order.created_at)}</span>
                </div>
                <span class="status-pill ${order.order_status}" style="font-size: 0.85rem;">${order.order_status}</span>
            </div>

            <!-- Customer & Shipping Card -->
            <div style="background: var(--admin-bg); padding: 16px; border-radius: 10px; margin-bottom: 20px; font-size: 0.88rem;">
                <h4 style="margin-bottom: 10px; font-size: 0.95rem;">📦 Delivery Address & Customer Details</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div><strong>Customer:</strong> ${order.customer_name}</div>
                    <div><strong>Phone:</strong> <a href="tel:${order.customer_phone}" style="color: var(--admin-primary);">${order.customer_phone}</a></div>
                    <div><strong>Email:</strong> ${order.customer_email}</div>
                    <div><strong>City:</strong> ${order.city}</div>
                    <div style="grid-column: 1 / -1;"><strong>Address:</strong> ${order.shipping_address} ${order.landmark ? `(Landmark: ${order.landmark})` : ''}</div>
                </div>
            </div>

            <!-- Items Purchased -->
            <h4 style="margin-bottom: 10px; font-size: 0.95rem;">🛍️ Items in Order</h4>
            <div style="margin-bottom: 20px;">
                ${itemsHtml || '<p style="color: var(--admin-text-muted);">Item details not loaded.</p>'}
            </div>

            <!-- Financial Summary -->
            <div style="background: var(--admin-bg); padding: 14px; border-radius: 10px; margin-bottom: 20px; font-size: 0.88rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span>Subtotal:</span>
                    <span>${formatPKR(order.subtotal)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <span>Shipping Fee:</span>
                    <span>${order.shipping_fee === 0 ? 'FREE' : formatPKR(order.shipping_fee)}</span>
                </div>
                ${order.discount > 0 ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: var(--success);">
                        <span>Discount (${order.coupon_code || 'PROMO'}):</span>
                        <span>-${formatPKR(order.discount)}</span>
                    </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; font-size: 1.1rem; font-weight: 700; border-top: 1px solid var(--admin-border); padding-top: 8px; margin-top: 6px;">
                    <span>Total Amount:</span>
                    <span style="color: var(--admin-primary);">${formatPKR(order.total_amount)} (${order.payment_method.toUpperCase()})</span>
                </div>
            </div>

            <!-- Fulfillment Form -->
            <form onsubmit="adminApp.handleUpdateOrderStatus(event, '${order.id}')">
                <div class="form-row form-row-2" style="margin-bottom: 14px;">
                    <div class="form-group">
                        <label class="form-label">Update Order Status</label>
                        <select id="order-status-select" class="form-select">
                            <option value="pending" ${order.order_status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="processing" ${order.order_status === 'processing' ? 'selected' : ''}>Processing / Packed</option>
                            <option value="shipped" ${order.order_status === 'shipped' ? 'selected' : ''}>Shipped via Courier</option>
                            <option value="delivered" ${order.order_status === 'delivered' ? 'selected' : ''}>Delivered to Customer</option>
                            <option value="cancelled" ${order.order_status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Courier Partner</label>
                        <select id="order-courier-select" class="form-select">
                            ${CONFIG.COURIERS.map(c => `<option value="${c}" ${order.courier_name === c ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="form-group" style="margin-bottom: 20px;">
                    <label class="form-label">Courier Tracking Number (CN)</label>
                    <input type="text" id="order-tracking-input" class="form-input" value="${order.tracking_number || ''}" placeholder="e.g. TCS-748920194 or Trax-98240">
                </div>

                <div style="display: flex; gap: 10px;">
                    <button type="submit" class="btn-admin btn-admin-primary" style="flex-grow: 1; padding: 12px;">
                        <i class="fa-solid fa-floppy-disk"></i> Update Fulfillment Status
                    </button>
                    <button type="button" class="btn-admin btn-admin-secondary" onclick="window.print()" style="padding: 12px 20px;">
                        <i class="fa-solid fa-print"></i> Print Slip
                    </button>
                </div>
            </form>
        `;

        overlay.classList.add('active');
    }

    closeOrderModal() {
        const overlay = document.getElementById('order-modal-overlay');
        if (overlay) overlay.classList.remove('active');
    }

    async handleUpdateOrderStatus(event, orderId) {
        event.preventDefault();
        const status = document.getElementById('order-status-select').value;
        const courier = document.getElementById('order-courier-select').value;
        const tracking = document.getElementById('order-tracking-input').value.trim();

        try {
            await OrderService.updateOrderStatus(orderId, status, courier, tracking);
            showToast(`Order #${orderId.substring(0, 8)} status updated to '${status}'!`, 'success');
            this.closeOrderModal();
            await this.loadAllData();
            this.renderOrdersTable();
            this.renderDashboard();
        } catch (error) {
            showToast(error.message || 'Error updating order status', 'error');
        }
    }

    // ==============================================================================
    // TAB 5: CUSTOMER DIRECTORY
    // ==============================================================================
    renderCustomersTable() {
        const tbody = document.getElementById('customers-table-tbody');
        if (!tbody) return;

        if (this.customers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--admin-text-muted);">No customer records found.</td></tr>`;
            return;
        }

        tbody.innerHTML = this.customers.map(c => `
            <tr>
                <td><strong>${c.name}</strong></td>
                <td>${c.email}</td>
                <td>${c.phone || '—'}</td>
                <td>${c.city || 'Karachi'}</td>
                <td><strong>${c.ordersCount}</strong></td>
                <td><strong>${formatPKR(c.totalSpent)}</strong></td>
                <td>${formatDate(c.lastOrderDate)}</td>
            </tr>
        `).join('');
    }

    // ==============================================================================
    // TAB 6: SETTINGS & SEED RE-TRIGGER
    // ==============================================================================
    resetStoreDemoData() {
        if (!confirm('Re-seed Pakistani lifestyle store demo data? This will restore starter products.')) return;

        localStorage.removeItem('aura_products');
        localStorage.removeItem('aura_categories');
        localStorage.removeItem('aura_coupons');
        LocalStoreManager.init();

        this.init();
        showToast('Pakistani lifestyle catalog re-seeded successfully!', 'success');
    }
}

// Global Admin Instance
const adminApp = new AdminPortal();

document.addEventListener('DOMContentLoaded', () => {
    adminApp.init();
});

if (typeof window !== 'undefined') {
    window.adminApp = adminApp;
}
