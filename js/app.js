/**
 * AURA LIFESTYLE - CUSTOMER STOREFRONT APPLICATION CONTROLLER
 * 
 * Manages product rendering, real-time filtering, search, cart/wishlist drawers,
 * quick view modal, checkout workflow, customer dashboard, and auth.
 */

class StorefrontApp {
    constructor() {
        this.categories = [];
        this.products = [];
        this.cart = [];
        this.wishlist = [];
        this.currentUser = null;

        // Active filter state
        this.activeFilters = {
            categoryId: null,
            search: '',
            minPrice: 0,
            maxPrice: 3000,
            isFeatured: null,
            isSale: null,
            isNew: null,
            inStockOnly: false,
            sortBy: 'newest'
        };

        this.featuredTab = 'all';
        this.appliedCoupon = null;
        this.quickViewProduct = null;
        this.quickViewSelectedVariant = '';
        this.quickViewQuantity = 1;
        this.checkoutPaymentMethod = 'cod';
    }

    async init() {
        try {
            // Load authenticated user
            await this.loadCurrentUser();

            // Load categories and initial products
            await this.loadCategories();
            await this.loadProducts();

            // Load Cart & Wishlist
            await this.loadCart();
            await this.loadWishlist();

            // Populate Pakistani Cities in checkout & profile
            this.populatePakistaniCities();

            // Render views
            this.renderHomeCategories();
            this.renderHomeProducts();
            this.renderShopFilters();
            this.renderCatalogProducts();

            console.log('✨ Aura Lifestyle Storefront Initialized');
        } catch (error) {
            console.error('Error initializing store:', error);
            showToast('Loaded in offline demo mode', 'info');
        }
    }

    // ==============================================================================
    // DATA LOADING
    // ==============================================================================
    async loadCurrentUser() {
        this.currentUser = await AuthService.getCurrentUser();
        this.updateNavAuthButton();
    }

    async loadCategories() {
        this.categories = await ProductService.getCategories();
    }

    async loadProducts() {
        this.products = await ProductService.getProducts();
    }

    async loadCart() {
        this.cart = await CartService.getCart();
        this.updateCartUI();
    }

    async loadWishlist() {
        this.wishlist = await WishlistService.getWishlist();
        this.updateWishlistUI();
    }

    populatePakistaniCities() {
        const citySelect = document.getElementById('checkout-city');
        const profileCitySelect = document.getElementById('profile-city');
        
        const optionsHtml = CONFIG.PAKISTANI_CITIES.map(city => 
            `<option value="${city}">${city}</option>`
        ).join('');

        if (citySelect) citySelect.innerHTML = optionsHtml;
        if (profileCitySelect) profileCitySelect.innerHTML = optionsHtml;
    }

    // ==============================================================================
    // NAVIGATION & SECTION SWITCHING
    // ==============================================================================
    showSection(sectionName) {
        const sections = ['home-section', 'shop-section', 'about-section', 'contact-section'];
        sections.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = (id === `${sectionName}-section`) ? 'block' : 'none';
        });

        // Update Nav links active state
        document.querySelectorAll('.nav-link').forEach(link => {
            const href = link.getAttribute('href');
            if (href === `#${sectionName}`) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Mobile bottom nav active state
        document.querySelectorAll('.mobile-nav-item').forEach(item => item.classList.remove('active'));
        const mobHome = document.getElementById('mob-nav-home');
        const mobShop = document.getElementById('mob-nav-shop');
        if (sectionName === 'home' && mobHome) mobHome.classList.add('active');
        if (sectionName === 'shop' && mobShop) mobShop.classList.add('active');

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    scrollToCategories() {
        this.showSection('home');
        setTimeout(() => {
            const el = document.getElementById('categories-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }

    toggleMobileNav(open) {
        const overlay = document.getElementById('mobile-nav-overlay');
        const panel = document.getElementById('mobile-nav-panel');
        if (overlay && panel) {
            overlay.classList.toggle('active', open);
            panel.style.left = open ? '0' : '-100%';
        }
    }

    // ==============================================================================
    // HOME VIEW RENDERING
    // ==============================================================================
    renderHomeCategories() {
        const container = document.getElementById('home-categories-grid');
        if (!container) return;

        container.innerHTML = this.categories.map(cat => `
            <div class="category-card" onclick="app.filterByCategory('${cat.id}')">
                <div class="category-img-circle">
                    <img src="${cat.image_url || 'https://images.unsplash.com/photo-1576053139778-7e32f2ae3cfd?w=400'}" alt="${cat.name}" loading="lazy">
                </div>
                <h4 class="category-title">${cat.name}</h4>
                <span class="category-count">Explore Items &rarr;</span>
            </div>
        `).join('');
    }

    renderHomeProducts() {
        const container = document.getElementById('home-products-grid');
        if (!container) return;

        let filtered = [...this.products];

        if (this.featuredTab === 'featured') {
            filtered = filtered.filter(p => p.is_featured);
        } else if (this.featuredTab === 'new') {
            filtered = filtered.filter(p => p.is_new);
        } else if (this.featuredTab === 'under999') {
            filtered = filtered.filter(p => p.price < 1000);
        } else if (this.featuredTab === 'sale') {
            filtered = filtered.filter(p => p.is_sale || (p.compare_at_price && p.compare_at_price > p.price));
        }

        // Show max 8 on home
        const displayItems = filtered.slice(0, 8);

        if (displayItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-state-icon">🛍️</div>
                    <h3>No products found</h3>
                    <p style="color: var(--text-muted);">Check back soon for new arrivals!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = displayItems.map(p => this.createProductCardHtml(p)).join('');
    }

    setFeaturedTab(tab, btnElement) {
        this.featuredTab = tab;
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        if (btnElement) btnElement.classList.add('active');
        this.renderHomeProducts();
    }

    // ==============================================================================
    // SHOP CATALOG & FILTERING
    // ==============================================================================
    renderShopFilters() {
        const catOptions = document.getElementById('filter-category-options');
        if (!catOptions) return;

        catOptions.innerHTML = `
            <label class="filter-checkbox">
                <input type="radio" name="category-filter" value="" ${!this.activeFilters.categoryId ? 'checked' : ''} onchange="app.handleCategoryRadioChange('')">
                <span>All Categories</span>
            </label>
        ` + this.categories.map(cat => `
            <label class="filter-checkbox">
                <input type="radio" name="category-filter" value="${cat.id}" ${this.activeFilters.categoryId === cat.id ? 'checked' : ''} onchange="app.handleCategoryRadioChange('${cat.id}')">
                <span>${cat.name}</span>
            </label>
        `).join('');
    }

    async renderCatalogProducts() {
        const container = document.getElementById('catalog-products-grid');
        const countDisplay = document.getElementById('catalog-count-display');
        if (!container) return;

        const filtered = await ProductService.getProducts(this.activeFilters);

        if (countDisplay) {
            countDisplay.innerText = filtered.length;
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <div class="empty-state-icon">🔍</div>
                    <h3>No products match your filters</h3>
                    <p style="color: var(--text-muted); margin-bottom: 16px;">Try adjusting your search query, price range, or category filter.</p>
                    <button class="btn btn-primary" onclick="app.resetAllFilters()">Reset Filters</button>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(p => this.createProductCardHtml(p)).join('');
    }

    createProductCardHtml(product) {
        const isWishlisted = this.wishlist.some(w => w.productId === product.id);
        const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
        const discountPercent = hasDiscount ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100) : 0;
        const isOutOfStock = product.stock_quantity <= 0;

        return `
            <div class="product-card">
                <div class="product-media">
                    <img src="${product.image_url}" alt="${product.name}" loading="lazy">
                    
                    <div class="product-badge-group">
                        ${hasDiscount ? `<span class="badge badge-sale">-${discountPercent}%</span>` : ''}
                        ${product.is_new ? `<span class="badge badge-new">New</span>` : ''}
                        ${isOutOfStock ? `<span class="badge" style="background: var(--danger); color: #fff;">Sold Out</span>` : ''}
                    </div>

                    <div class="product-actions-floating">
                        <button class="btn-wishlist-toggle ${isWishlisted ? 'active' : ''}" onclick="app.toggleWishlist('${product.id}')" title="Add to Wishlist">
                            <i class="${isWishlisted ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                        </button>
                    </div>

                    <button class="btn-quickview" onclick="app.openQuickView('${product.id}')">
                        <i class="fa-regular fa-eye"></i> Quick View
                    </button>
                </div>

                <div class="product-body">
                    <span class="product-category-name">${product.category?.name || 'Accessories'}</span>
                    <h3 class="product-title" onclick="app.openQuickView('${product.id}')" style="cursor: pointer;">${product.name}</h3>
                    
                    <div class="product-rating">
                        <span>★</span>
                        <span>${product.rating || '4.9'}</span>
                        <span class="rating-count">(${product.reviews_count || 12})</span>
                    </div>

                    <div class="product-price-row">
                        <span class="price-current">${formatPKR(product.price)}</span>
                        ${hasDiscount ? `<span class="price-compare">${formatPKR(product.compare_at_price)}</span>` : ''}
                    </div>

                    <button class="product-card-btn" onclick="app.quickAddToCart('${product.id}')" ${isOutOfStock ? 'disabled style="opacity: 0.6; cursor: not-allowed;"' : ''}>
                        <i class="fa-solid fa-bag-shopping"></i> ${isOutOfStock ? 'Out of Stock' : 'Add to Bag'}
                    </button>
                </div>
            </div>
        `;
    }

    filterByCategory(categoryId) {
        this.activeFilters.categoryId = categoryId;
        this.showSection('shop');
        this.renderShopFilters();
        this.renderCatalogProducts();
    }

    filterByBadge(badge) {
        this.resetAllFilters(false);
        if (badge === 'new') this.activeFilters.isNew = true;
        if (badge === 'sale') this.activeFilters.isSale = true;
        this.showSection('shop');
        this.renderShopFilters();
        this.renderCatalogProducts();
    }

    handleCategoryRadioChange(catId) {
        this.activeFilters.categoryId = catId || null;
        this.renderCatalogProducts();
    }

    handlePriceFilter(val) {
        this.activeFilters.maxPrice = Number(val);
        const label = document.getElementById('price-slider-value');
        if (label) label.innerText = formatPKR(val);
        this.debouncedCatalogRender();
    }

    handleFilterChange() {
        const inStock = document.getElementById('filter-instock');
        const sale = document.getElementById('filter-sale');
        const featured = document.getElementById('filter-featured');

        this.activeFilters.inStockOnly = inStock ? inStock.checked : false;
        this.activeFilters.isSale = (sale && sale.checked) ? true : null;
        this.activeFilters.isFeatured = (featured && featured.checked) ? true : null;

        this.renderCatalogProducts();
    }

    handleSortChange(sortBy) {
        this.activeFilters.sortBy = sortBy;
        this.renderCatalogProducts();
    }

    handleSearch(query) {
        this.activeFilters.search = query.trim();
        // Sync search inputs
        const navInput = document.getElementById('nav-search-input');
        const shopInput = document.getElementById('shop-search-input');
        if (navInput && navInput.value !== query) navInput.value = query;
        if (shopInput && shopInput.value !== query) shopInput.value = query;

        if (this.activeFilters.search.length > 0) {
            this.showSection('shop');
        }
        this.debouncedCatalogRender();
    }

    debouncedCatalogRender = debounce(() => {
        this.renderCatalogProducts();
    }, 250);

    resetAllFilters(reRender = true) {
        this.activeFilters = {
            categoryId: null,
            search: '',
            minPrice: 0,
            maxPrice: 3000,
            isFeatured: null,
            isSale: null,
            isNew: null,
            inStockOnly: false,
            sortBy: 'newest'
        };

        const navInput = document.getElementById('nav-search-input');
        const shopInput = document.getElementById('shop-search-input');
        const slider = document.getElementById('price-slider');
        const sliderVal = document.getElementById('price-slider-value');
        const inStock = document.getElementById('filter-instock');
        const sale = document.getElementById('filter-sale');
        const featured = document.getElementById('filter-featured');

        if (navInput) navInput.value = '';
        if (shopInput) shopInput.value = '';
        if (slider) slider.value = 3000;
        if (sliderVal) sliderVal.innerText = formatPKR(3000);
        if (inStock) inStock.checked = false;
        if (sale) sale.checked = false;
        if (featured) featured.checked = false;

        this.renderShopFilters();
        if (reRender) this.renderCatalogProducts();
    }

    // ==============================================================================
    // QUICK VIEW MODAL
    // ==============================================================================
    async openQuickView(productId) {
        const product = await ProductService.getProductById(productId);
        if (!product) return;

        this.quickViewProduct = product;
        this.quickViewQuantity = 1;

        // Default variant option
        if (product.variants && product.variants.length > 0 && product.variants[0].options?.length > 0) {
            this.quickViewSelectedVariant = product.variants[0].options[0];
        } else {
            this.quickViewSelectedVariant = '';
        }

        const modalBody = document.getElementById('quickview-modal-body');
        const overlay = document.getElementById('quickview-modal-overlay');
        if (!modalBody || !overlay) return;

        const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
        const discountPercent = hasDiscount ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100) : 0;
        const inStock = product.stock_quantity > 0;

        let variantsHtml = '';
        if (product.variants && product.variants.length > 0) {
            product.variants.forEach(variant => {
                variantsHtml += `
                    <div class="variant-picker">
                        <div class="variant-picker-title">${variant.name}: <span style="font-weight: 400; color: var(--primary);" id="selected-variant-label">${this.quickViewSelectedVariant}</span></div>
                        <div class="variant-pills">
                            ${variant.options.map(opt => `
                                <button type="button" class="variant-pill ${opt === this.quickViewSelectedVariant ? 'active' : ''}" onclick="app.selectQuickViewVariant('${opt}')">
                                    ${opt}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `;
            });
        }

        modalBody.innerHTML = `
            <div class="quickview-gallery">
                <img src="${product.image_url}" alt="${product.name}" id="qv-main-image">
            </div>
            <div>
                <span class="product-category-name">${product.category?.name || 'Accessories'}</span>
                <h2 style="font-size: 1.5rem; margin-bottom: 8px;">${product.name}</h2>
                
                <div class="product-rating" style="margin-bottom: 12px;">
                    <span>★</span>
                    <span>${product.rating || '4.9'}</span>
                    <span class="rating-count">(${product.reviews_count || 18} Pakistani Reviews)</span>
                </div>

                <div class="product-price-row" style="margin-bottom: 16px;">
                    <span class="price-current" style="font-size: 1.5rem;">${formatPKR(product.price)}</span>
                    ${hasDiscount ? `<span class="price-compare" style="font-size: 1.1rem;">${formatPKR(product.compare_at_price)}</span>` : ''}
                    ${hasDiscount ? `<span class="badge badge-sale">Save ${discountPercent}%</span>` : ''}
                </div>

                <div style="margin-bottom: 16px;">
                    <span class="stock-pill ${inStock ? (product.stock_quantity <= 5 ? 'stock-low' : 'stock-in') : 'stock-out'}">
                        ${inStock ? (product.stock_quantity <= 5 ? `⚠️ Only ${product.stock_quantity} left in stock!` : `🟢 In Stock (${product.stock_quantity} units)`) : '🔴 Sold Out'}
                    </span>
                </div>

                <p style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.6; margin-bottom: 16px;">
                    ${product.description || 'Premium high quality Pakistani lifestyle essential crafted with care.'}
                </p>

                ${variantsHtml}

                <div style="display: flex; gap: 12px; align-items: center; margin: 20px 0;">
                    <div class="qty-stepper" style="height: 42px;">
                        <button class="qty-btn" style="width: 34px;" onclick="app.adjustQuickViewQty(-1)">-</button>
                        <span class="qty-display" id="qv-qty-display" style="width: 40px;">1</span>
                        <button class="qty-btn" style="width: 34px;" onclick="app.adjustQuickViewQty(1)">+</button>
                    </div>

                    <button class="btn btn-primary btn-block" style="height: 42px;" onclick="app.addQuickViewToCart()" ${!inStock ? 'disabled style="opacity: 0.6; cursor: not-allowed;"' : ''}>
                        <i class="fa-solid fa-bag-shopping"></i> ${inStock ? 'Add to Bag' : 'Sold Out'}
                    </button>
                </div>

                <div style="border-top: 1px solid var(--border-color); padding-top: 14px; font-size: 0.82rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 6px;">
                    <div>🇵🇰 <strong>Nationwide Delivery:</strong> 2-4 working days via TCS / Trax</div>
                    <div>💵 <strong>Payment:</strong> Cash on Delivery & Bank Transfer</div>
                    <div>🔄 <strong>Returns:</strong> 7-Day hassle-free replacement</div>
                </div>
            </div>
        `;

        overlay.classList.add('active');
    }

    closeQuickView() {
        const overlay = document.getElementById('quickview-modal-overlay');
        if (overlay) overlay.classList.remove('active');
    }

    selectQuickViewVariant(optionName) {
        this.quickViewSelectedVariant = optionName;
        document.querySelectorAll('.variant-pill').forEach(pill => {
            pill.classList.toggle('active', pill.innerText.trim() === optionName);
        });
        const label = document.getElementById('selected-variant-label');
        if (label) label.innerText = optionName;
    }

    adjustQuickViewQty(delta) {
        if (!this.quickViewProduct) return;
        const newQty = this.quickViewQuantity + delta;
        const maxStock = this.quickViewProduct.stock_quantity || 10;
        if (newQty >= 1 && newQty <= maxStock) {
            this.quickViewQuantity = newQty;
            const display = document.getElementById('qv-qty-display');
            if (display) display.innerText = newQty;
        }
    }

    async addQuickViewToCart() {
        if (!this.quickViewProduct) return;
        await CartService.addToCart(this.quickViewProduct, this.quickViewQuantity, this.quickViewSelectedVariant);
        await this.loadCart();
        this.closeQuickView();
        this.toggleCartDrawer(true);
        showToast(`Added ${this.quickViewProduct.name} to bag!`, 'success');
    }

    async quickAddToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        let defaultVariant = '';
        if (product.variants && product.variants.length > 0 && product.variants[0].options?.length > 0) {
            defaultVariant = product.variants[0].options[0];
        }

        await CartService.addToCart(product, 1, defaultVariant);
        await this.loadCart();
        this.toggleCartDrawer(true);
        showToast(`Added ${product.name} to bag!`, 'success');
    }

    // ==============================================================================
    // WISHLIST MANAGEMENT
    // ==============================================================================
    async toggleWishlist(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const res = await WishlistService.toggleWishlist(product);
        await this.loadWishlist();

        // Update home & catalog card active buttons
        this.renderHomeProducts();
        this.renderCatalogProducts();

        if (res.added) {
            showToast(`Added to your wishlist! 💖`, 'success');
        } else {
            showToast(`Removed from wishlist`, 'info');
        }
    }

    updateWishlistUI() {
        const badge = document.getElementById('wishlist-count-badge');
        const drawerCount = document.getElementById('wishlist-drawer-count');
        const container = document.getElementById('wishlist-items-container');

        const count = this.wishlist.length;
        if (badge) badge.innerText = count;
        if (drawerCount) drawerCount.innerText = count;

        if (!container) return;

        if (count === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">💖</div>
                    <h4>Your wishlist is empty</h4>
                    <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 16px;">Save items you love by tapping the heart icon!</p>
                    <button class="btn btn-outline btn-sm" onclick="app.toggleWishlistDrawer(false); app.showSection('shop');">Explore Products</button>
                </div>
            `;
            return;
        }

        container.innerHTML = this.wishlist.map(item => `
            <div class="cart-item-card">
                <img src="${item.image_url}" alt="${item.name}" class="cart-item-img">
                <div class="cart-item-info">
                    <h4 class="cart-item-title">${item.name}</h4>
                    <div class="cart-item-variant">${item.categoryName}</div>
                    <div class="cart-item-price">${formatPKR(item.price)}</div>
                    <div class="cart-item-controls">
                        <button class="btn btn-primary btn-sm" onclick="app.moveWishlistToCart('${item.productId}')">
                            Move to Bag
                        </button>
                        <button class="btn-remove-item" onclick="app.toggleWishlist('${item.productId}')">
                            Remove
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    toggleWishlistDrawer(open) {
        const overlay = document.getElementById('wishlist-drawer-overlay');
        const panel = document.getElementById('wishlist-drawer-panel');
        if (overlay && panel) {
            overlay.classList.toggle('active', open);
            panel.classList.toggle('active', open);
        }
    }

    async moveWishlistToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            await CartService.addToCart(product, 1);
            await WishlistService.toggleWishlist(product);
            await this.loadWishlist();
            await this.loadCart();
            this.toggleWishlistDrawer(false);
            this.toggleCartDrawer(true);
            showToast(`Moved ${product.name} to bag!`, 'success');
        }
    }

    // ==============================================================================
    // CART DRAWER & CALCULATIONS
    // ==============================================================================
    updateCartUI() {
        const badge = document.getElementById('cart-count-badge');
        const drawerCount = document.getElementById('cart-drawer-count');
        const container = document.getElementById('cart-items-container');
        const footer = document.getElementById('cart-footer');

        const totalQty = this.cart.reduce((sum, i) => sum + i.quantity, 0);
        const subtotal = this.cart.reduce((sum, i) => sum + (Number(i.price) * Number(i.quantity)), 0);

        if (badge) badge.innerText = totalQty;
        if (drawerCount) drawerCount.innerText = totalQty;

        // Free Shipping Progress Meter
        const threshold = CONFIG.FREE_SHIPPING_THRESHOLD;
        const progressFill = document.getElementById('free-shipping-fill');
        const progressText = document.getElementById('free-shipping-text');

        if (progressFill && progressText) {
            const percentage = Math.min(100, Math.round((subtotal / threshold) * 100));
            progressFill.style.width = `${percentage}%`;

            if (subtotal >= threshold) {
                progressText.innerHTML = `🎉 <strong>Congratulations!</strong> You unlocked <strong>FREE Delivery</strong>!`;
            } else {
                const diff = threshold - subtotal;
                progressText.innerHTML = `<i class="fa-solid fa-truck"></i> Add <strong>${formatPKR(diff)}</strong> more for <strong>FREE Delivery</strong>!`;
            }
        }

        if (!container) return;

        if (this.cart.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🛍️</div>
                    <h4>Your shopping bag is empty</h4>
                    <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 16px;">Add aesthetic jewelry, scrunchies, or bags to get started!</p>
                    <button class="btn btn-primary btn-sm" onclick="app.toggleCartDrawer(false); app.showSection('shop');">Start Shopping</button>
                </div>
            `;
            if (footer) footer.style.display = 'none';
            return;
        }

        if (footer) footer.style.display = 'block';

        // Render Cart Items
        container.innerHTML = this.cart.map(item => `
            <div class="cart-item-card">
                <img src="${item.image_url}" alt="${item.name}" class="cart-item-img">
                <div class="cart-item-info">
                    <h4 class="cart-item-title">${item.name}</h4>
                    ${item.variantName ? `<div class="cart-item-variant">${item.variantName}</div>` : ''}
                    <div class="cart-item-price">${formatPKR(item.price)}</div>
                    <div class="cart-item-controls">
                        <div class="qty-stepper">
                            <button class="qty-btn" onclick="app.updateCartQty('${item.id}', ${item.quantity - 1})">-</button>
                            <span class="qty-display">${item.quantity}</span>
                            <button class="qty-btn" onclick="app.updateCartQty('${item.id}', ${item.quantity + 1})">+</button>
                        </div>
                        <button class="btn-remove-item" onclick="app.removeCartItem('${item.id}')">
                            <i class="fa-regular fa-trash-can"></i> Remove
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Recalculate summary totals
        this.calculateTotals(subtotal);
    }

    calculateTotals(subtotal) {
        const isFreeShipping = subtotal >= CONFIG.FREE_SHIPPING_THRESHOLD || (this.appliedCoupon && this.appliedCoupon.discount_type === 'free_shipping');
        const shippingFee = (subtotal === 0 || isFreeShipping) ? 0 : CONFIG.FLAT_SHIPPING_FEE;

        let discount = 0;
        if (this.appliedCoupon) {
            if (this.appliedCoupon.discount_type === 'percentage') {
                discount = (subtotal * Number(this.appliedCoupon.discount_value)) / 100;
            } else if (this.appliedCoupon.discount_type === 'fixed') {
                discount = Number(this.appliedCoupon.discount_value);
            }
        }

        const total = Math.max(0, subtotal - discount + shippingFee);

        // Update displays in Cart Drawer
        const subtotalDisp = document.getElementById('cart-subtotal-display');
        const discountRow = document.getElementById('cart-discount-row');
        const discountDisp = document.getElementById('cart-discount-display');
        const shippingDisp = document.getElementById('cart-shipping-display');
        const totalDisp = document.getElementById('cart-total-display');

        if (subtotalDisp) subtotalDisp.innerText = formatPKR(subtotal);
        if (discountRow) {
            discountRow.style.display = discount > 0 ? 'flex' : 'none';
            if (discountDisp) discountDisp.innerText = `-${formatPKR(discount)}`;
        }
        if (shippingDisp) shippingDisp.innerText = shippingFee === 0 ? 'FREE' : formatPKR(shippingFee);
        if (totalDisp) totalDisp.innerText = formatPKR(total);

        // Update displays in Checkout Modal
        const ckSub = document.getElementById('checkout-subtotal');
        const ckDiscRow = document.getElementById('checkout-discount-row');
        const ckDisc = document.getElementById('checkout-discount');
        const ckShip = document.getElementById('checkout-shipping');
        const ckTotal = document.getElementById('checkout-total');

        if (ckSub) ckSub.innerText = formatPKR(subtotal);
        if (ckDiscRow) {
            ckDiscRow.style.display = discount > 0 ? 'flex' : 'none';
            if (ckDisc) ckDisc.innerText = `-${formatPKR(discount)}`;
        }
        if (ckShip) ckShip.innerText = shippingFee === 0 ? 'FREE' : formatPKR(shippingFee);
        if (ckTotal) ckTotal.innerText = formatPKR(total);

        return { subtotal, shippingFee, discount, total };
    }

    async updateCartQty(cartItemId, newQty) {
        await CartService.updateQuantity(cartItemId, newQty);
        await this.loadCart();
    }

    async removeCartItem(cartItemId) {
        await CartService.removeFromCart(cartItemId);
        await this.loadCart();
        showToast('Item removed from shopping bag', 'info');
    }

    toggleCartDrawer(open) {
        const overlay = document.getElementById('cart-drawer-overlay');
        const panel = document.getElementById('cart-drawer-panel');
        if (overlay && panel) {
            overlay.classList.toggle('active', open);
            panel.classList.toggle('active', open);
        }
    }

    async applyCouponFromCart() {
        const input = document.getElementById('cart-coupon-input');
        if (!input || !input.value.trim()) {
            showToast('Please enter a coupon code', 'warning');
            return;
        }

        const subtotal = this.cart.reduce((sum, i) => sum + (Number(i.price) * Number(i.quantity)), 0);
        const res = await CouponService.validateCoupon(input.value.trim(), subtotal);

        if (res.valid) {
            this.appliedCoupon = res.coupon;
            this.updateCartUI();
            showToast(res.message, 'success');
        } else {
            showToast(res.message, 'error');
        }
    }

    applyPromoAndShop(code) {
        const input = document.getElementById('cart-coupon-input');
        if (input) input.value = code;
        this.showSection('shop');
        showToast(`Coupon ${code} activated! Add items to cart to apply.`, 'success');
    }

    copyCoupon(code) {
        navigator.clipboard.writeText(code);
        showToast(`Copied ${code} to clipboard!`, 'success');
    }

    // ==============================================================================
    // CHECKOUT WORKFLOW
    // ==============================================================================
    openCheckoutModal() {
        if (this.cart.length === 0) {
            showToast('Your shopping bag is empty!', 'warning');
            return;
        }

        this.toggleCartDrawer(false);

        // Autofill with logged in user info if available
        if (this.currentUser) {
            const nameInp = document.getElementById('checkout-name');
            const phoneInp = document.getElementById('checkout-phone');
            const emailInp = document.getElementById('checkout-email');
            const addrInp = document.getElementById('checkout-address');
            const citySelect = document.getElementById('checkout-city');

            if (nameInp) nameInp.value = this.currentUser.profile?.full_name || '';
            if (phoneInp) phoneInp.value = this.currentUser.profile?.phone || '';
            if (emailInp) emailInp.value = this.currentUser.email || '';
            if (addrInp) addrInp.value = this.currentUser.profile?.address || '';
            if (citySelect && this.currentUser.profile?.city) citySelect.value = this.currentUser.profile.city;
        }

        const overlay = document.getElementById('checkout-modal-overlay');
        if (overlay) overlay.classList.add('active');
    }

    closeCheckoutModal() {
        const overlay = document.getElementById('checkout-modal-overlay');
        if (overlay) overlay.classList.remove('active');
    }

    selectPaymentMethod(method, cardElement) {
        this.checkoutPaymentMethod = method;
        document.querySelectorAll('.payment-method-card').forEach(card => card.classList.remove('active'));
        if (cardElement) cardElement.classList.add('active');

        const btn = document.getElementById('place-order-btn');
        if (btn) {
            let label = 'Place Order (Cash on Delivery)';
            if (method === 'bank_transfer') label = 'Proceed with Bank Transfer / Raast';
            if (method === 'easypaisa_jazzcash') label = 'Proceed with JazzCash / EasyPaisa';
            btn.innerHTML = `<i class="fa-solid fa-check"></i> ${label}`;
        }
    }

    async handlePlaceOrder(event) {
        event.preventDefault();

        const name = document.getElementById('checkout-name').value.trim();
        const phone = document.getElementById('checkout-phone').value.trim();
        const email = document.getElementById('checkout-email').value.trim();
        const city = document.getElementById('checkout-city').value;
        const landmark = document.getElementById('checkout-landmark').value.trim();
        const address = document.getElementById('checkout-address').value.trim();

        if (!validatePakistaniPhone(phone)) {
            showToast('Please enter a valid Pakistani phone number (e.g. 0300-1234567)', 'error');
            return;
        }

        const subtotal = this.cart.reduce((sum, i) => sum + (Number(i.price) * Number(i.quantity)), 0);
        const { shippingFee, discount, total } = this.calculateTotals(subtotal);

        const btn = document.getElementById('place-order-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing Order...`;
        }

        try {
            const orderPayload = {
                customerName: name,
                customerEmail: email,
                customerPhone: phone,
                shippingAddress: address,
                city: city,
                landmark: landmark,
                paymentMethod: this.checkoutPaymentMethod,
                subtotal: subtotal,
                shippingFee: shippingFee,
                discount: discount,
                totalAmount: total,
                couponCode: this.appliedCoupon ? this.appliedCoupon.code : '',
                items: this.cart
            };

            const order = await OrderService.createOrder(orderPayload);

            // Clear local cart state
            this.cart = [];
            this.appliedCoupon = null;
            this.updateCartUI();

            this.closeCheckoutModal();
            this.renderOrderSuccess(order);

        } catch (error) {
            console.error('Order placement error:', error);
            showToast(error.message || 'Failed to place order. Please try again.', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<i class="fa-solid fa-check"></i> Place Order`;
            }
        }
    }

    renderOrderSuccess(order) {
        const overlay = document.getElementById('order-success-modal-overlay');
        const content = document.getElementById('order-success-content');
        if (!overlay || !content) return;

        const isCOD = order.payment_method === 'cod';
        const waText = encodeURIComponent(`Hi Aura Lifestyle! I just placed order #${order.order_number} for ${formatPKR(order.total_amount)}. Please confirm dispatch!`);

        content.innerHTML = `
            <div class="success-icon-circle">✓</div>
            <h2 style="font-size: 1.8rem; color: var(--secondary); margin-bottom: 6px;">Order Confirmed!</h2>
            <p style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 20px;">
                Thank you, <strong>${order.customer_name}</strong>! Your order has been placed successfully and sent for packing.
            </p>

            <div style="background: var(--bg-alt); padding: 18px; border-radius: var(--radius-md); text-align: left; margin-bottom: 24px; font-size: 0.88rem;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <strong>Order Number:</strong>
                    <span style="font-family: monospace; color: var(--primary); font-weight: 700;">${order.order_number}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <strong>Delivery To:</strong>
                    <span>${order.shipping_address}, ${order.city}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <strong>Contact:</strong>
                    <span>${order.customer_phone}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <strong>Payment:</strong>
                    <span style="text-transform: capitalize;">${order.payment_method.replace('_', ' ')} (${formatPKR(order.total_amount)})</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <strong>Estimated Delivery:</strong>
                    <span>2-4 working days (via TCS/Trax)</span>
                </div>
            </div>

            ${!isCOD ? `
                <div style="background: #FEF3C7; color: #92400E; padding: 12px; border-radius: 8px; font-size: 0.82rem; margin-bottom: 20px; text-align: left;">
                    ⚠️ Please send your payment screenshot to our WhatsApp (+92 300 1234567) mentioning reference order #${order.order_number}.
                </div>
            ` : ''}

            <div style="display: flex; flex-direction: column; gap: 10px;">
                <a href="https://wa.me/923001234567?text=${waText}" target="_blank" class="btn btn-primary btn-block">
                    <i class="fa-brands fa-whatsapp"></i> Confirm on WhatsApp
                </a>
                <button class="btn btn-light btn-block" onclick="window.print()">
                    <i class="fa-solid fa-print"></i> Print Receipt
                </button>
                <button class="btn btn-outline btn-block" onclick="document.getElementById('order-success-modal-overlay').classList.remove('active'); app.showSection('home');">
                    Continue Shopping
                </button>
            </div>
        `;

        overlay.classList.add('active');
    }

    // ==============================================================================
    // AUTHENTICATION & CUSTOMER DASHBOARD
    // ==============================================================================
    updateNavAuthButton() {
        const btn = document.getElementById('nav-auth-btn');
        if (!btn) return;

        if (this.currentUser) {
            btn.innerHTML = `<i class="fa-solid fa-user-check" style="color: var(--primary);"></i>`;
            btn.title = `Logged in as ${this.currentUser.profile?.full_name || 'Customer'}`;
        } else {
            btn.innerHTML = `<i class="fa-regular fa-user"></i>`;
            btn.title = 'Account / Login';
        }
    }

    handleAuthButtonClick() {
        if (this.currentUser) {
            this.openAccountModal();
        } else {
            this.openAuthModal();
        }
    }

    openAuthModal() {
        const overlay = document.getElementById('auth-modal-overlay');
        if (overlay) overlay.classList.add('active');
    }

    closeAuthModal() {
        const overlay = document.getElementById('auth-modal-overlay');
        if (overlay) overlay.classList.remove('active');
    }

    switchAuthTab(tab) {
        const loginBtn = document.getElementById('tab-login-btn');
        const signupBtn = document.getElementById('tab-signup-btn');
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        const subtitle = document.getElementById('auth-modal-subtitle');

        if (tab === 'login') {
            loginBtn.classList.add('active');
            signupBtn.classList.remove('active');
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
            subtitle.innerText = 'Login to view orders and save wishlist';
        } else {
            loginBtn.classList.remove('active');
            signupBtn.classList.add('active');
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
            subtitle.innerText = 'Create your account in 30 seconds';
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        try {
            await AuthService.signIn(email, password);
            await this.loadCurrentUser();
            await this.loadCart();
            await this.loadWishlist();
            this.closeAuthModal();
            showToast(`Welcome back, ${this.currentUser.profile?.full_name || 'Customer'}!`, 'success');
        } catch (error) {
            showToast(error.message || 'Login failed', 'error');
        }
    }

    async handleSignup(event) {
        event.preventDefault();
        const name = document.getElementById('signup-name').value.trim();
        const phone = document.getElementById('signup-phone').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;

        try {
            await AuthService.signUp(email, password, name, phone, '', 'Karachi');
            await this.loadCurrentUser();
            this.closeAuthModal();
            showToast(`Account created successfully! Welcome to Aura Lifestyle!`, 'success');
        } catch (error) {
            showToast(error.message || 'Signup failed', 'error');
        }
    }

    async handleLogout() {
        await AuthService.signOut();
        this.currentUser = null;
        this.updateNavAuthButton();
        this.closeAccountModal();
        await this.loadCart();
        await this.loadWishlist();
        showToast('Signed out successfully', 'info');
    }

    async openAccountModal() {
        if (!this.currentUser) return this.openAuthModal();

        const greeting = document.getElementById('account-user-greeting');
        if (greeting) greeting.innerText = `Logged in as ${this.currentUser.profile?.full_name || this.currentUser.email}`;

        // Populate profile fields
        const nameInp = document.getElementById('profile-name');
        const phoneInp = document.getElementById('profile-phone');
        const citySelect = document.getElementById('profile-city');
        const addrInp = document.getElementById('profile-address');

        if (nameInp) nameInp.value = this.currentUser.profile?.full_name || '';
        if (phoneInp) phoneInp.value = this.currentUser.profile?.phone || '';
        if (citySelect && this.currentUser.profile?.city) citySelect.value = this.currentUser.profile.city;
        if (addrInp) addrInp.value = this.currentUser.profile?.address || '';

        // Load order history
        await this.renderCustomerOrders();

        const overlay = document.getElementById('account-modal-overlay');
        if (overlay) overlay.classList.add('active');
    }

    closeAccountModal() {
        const overlay = document.getElementById('account-modal-overlay');
        if (overlay) overlay.classList.remove('active');
    }

    switchAccountTab(tab) {
        const ordersBtn = document.getElementById('acc-tab-orders-btn');
        const profileBtn = document.getElementById('acc-tab-profile-btn');
        const ordersView = document.getElementById('acc-orders-view');
        const profileView = document.getElementById('acc-profile-view');

        if (tab === 'orders') {
            ordersBtn.classList.add('active');
            profileBtn.classList.remove('active');
            ordersView.style.display = 'block';
            profileView.style.display = 'none';
        } else {
            ordersBtn.classList.remove('active');
            profileBtn.classList.add('active');
            ordersView.style.display = 'none';
            profileView.style.display = 'block';
        }
    }

    async renderCustomerOrders() {
        const container = document.getElementById('customer-orders-list');
        if (!container) return;

        const orders = await OrderService.getCustomerOrders();

        if (orders.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <h4>No orders placed yet</h4>
                    <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 16px;">Your placed orders will show up here with live courier tracking!</p>
                    <button class="btn btn-primary btn-sm" onclick="app.closeAccountModal(); app.showSection('shop');">Start Shopping</button>
                </div>
            `;
            return;
        }

        container.innerHTML = orders.map(o => {
            const status = o.order_status || 'pending';
            const steps = ['pending', 'processing', 'shipped', 'delivered'];
            const currentStepIdx = steps.indexOf(status);

            return `
                <div class="order-history-card">
                    <div class="order-history-header">
                        <div>
                            <strong>#${o.order_number}</strong>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">${formatDate(o.created_at)}</div>
                        </div>
                        <span class="order-status-badge status-${status}">${status}</span>
                    </div>

                    <!-- Progress Stepper -->
                    <div class="status-stepper">
                        <div class="step-item ${currentStepIdx >= 0 ? 'completed' : ''}">
                            <div class="step-circle">1</div>
                            <span class="step-label">Pending</span>
                        </div>
                        <div class="step-item ${currentStepIdx >= 1 ? 'completed' : ''}">
                            <div class="step-circle">2</div>
                            <span class="step-label">Processing</span>
                        </div>
                        <div class="step-item ${currentStepIdx >= 2 ? 'completed' : ''}">
                            <div class="step-circle">3</div>
                            <span class="step-label">Shipped</span>
                        </div>
                        <div class="step-item ${currentStepIdx >= 3 ? 'completed' : ''}">
                            <div class="step-circle">4</div>
                            <span class="step-label">Delivered</span>
                        </div>
                    </div>

                    ${o.tracking_number ? `
                        <div style="background: var(--bg-alt); padding: 10px 14px; border-radius: 8px; font-size: 0.82rem; margin-bottom: 12px;">
                            🚚 <strong>${o.courier_name || 'TCS Express'} Tracking ID:</strong> <span style="font-family: monospace; font-weight: 700;">${o.tracking_number}</span>
                        </div>
                    ` : ''}

                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-main);">
                        <span>Total Paid: <strong>${formatPKR(o.total_amount)}</strong> (${o.payment_method.toUpperCase()})</span>
                        <span>Delivery: ${o.city}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    async handleUpdateProfile(event) {
        event.preventDefault();
        if (!this.currentUser) return;

        const name = document.getElementById('profile-name').value.trim();
        const phone = document.getElementById('profile-phone').value.trim();
        const city = document.getElementById('profile-city').value;
        const address = document.getElementById('profile-address').value.trim();

        try {
            await AuthService.updateProfile(this.currentUser.id, {
                full_name: name,
                phone: phone,
                city: city,
                address: address
            });
            await this.loadCurrentUser();
            showToast('Profile updated successfully!', 'success');
        } catch (error) {
            showToast(error.message || 'Failed to update profile', 'error');
        }
    }

    handleContactSubmit(event) {
        event.preventDefault();
        showToast('Thank you! Your message has been received. Our team will contact you via WhatsApp/Email shortly.', 'success');
        event.target.reset();
    }
}

// Global Storefront App Instance
const app = new StorefrontApp();

document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

if (typeof window !== 'undefined') {
    window.app = app;
}
