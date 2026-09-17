/**
 * AURA LIFESTYLE - CONFIGURATION & UTILITY HELPERS
 * 
 * Instructions:
 * Replace SUPABASE_URL and SUPABASE_ANON_KEY with your own Supabase project details.
 * You can get them from your Supabase Dashboard -> Project Settings -> API.
 */

const CONFIG = {
    // Supabase Credentials
    SUPABASE_URL: window.ENV_SUPABASE_URL || 'https://xhfaybnwbevmnqtltvam.supabase.co',
    SUPABASE_ANON_KEY: window.ENV_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoZmF5Ym53YmV2bW5xdGx0dmFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NjE3ODIsImV4cCI6MjEwNTIzNzc4Mn0.gl8VF6CrWJk47Usl26_XYQTZEeIEsKiOD519sWQ3SHk',

    // Storage bucket for product images
    STORAGE_BUCKET: 'product-images',

    // Store Branding & Defaults
    STORE_NAME: 'Aura Lifestyle',
    STORE_TAGLINE: 'Affordable Chic & Aesthetic Essentials',
    STORE_CURRENCY: 'Rs.',
    STORE_PHONE: '+92 300 1234567',
    STORE_WHATSAPP: '923001234567',
    STORE_EMAIL: 'support@auralifestyle.pk',

    // Shipping Rules (in PKR)
    FLAT_SHIPPING_FEE: 199,
    FREE_SHIPPING_THRESHOLD: 2499, // Free shipping if cart subtotal >= Rs. 2,499

    // Pakistani Major Cities for Delivery
    PAKISTANI_CITIES: [
        'Karachi',
        'Lahore',
        'Islamabad',
        'Rawalpindi',
        'Faisalabad',
        'Multan',
        'Peshawar',
        'Quetta',
        'Sialkot',
        'Gujranwala',
        'Hyderabad',
        'Abbottabad',
        'Bahawalpur',
        'Sargodha',
        'Sukkur',
        'Larkana',
        'Sheikhupura',
        'Jhang',
        'Rahim Yar Khan',
        'Gujrat',
        'Mardan',
        'Kasur',
        'Dera Ghazi Khan',
        'Sahiwal',
        'Mirpur (AJK)',
        'Muzaffarabad',
        'Wah Cantt',
        'Okara',
        'Mingora (Swat)',
        'Other City (Pakistan)'
    ],

    // Pakistani Couriers
    COURIERS: [
        'TCS Express',
        'Trax Logistics',
        'Leopards Courier',
        'Call Courier',
        'M&P Express',
        'Rider Pakistan',
        'PostEx'
    ],

    // Payment Methods
    PAYMENT_METHODS: {
        cod: {
            id: 'cod',
            name: 'Cash on Delivery (COD)',
            desc: 'Pay cash when your parcel arrives at your doorstep.',
            badge: 'Most Popular'
        },
        bank_transfer: {
            id: 'bank_transfer',
            name: 'Direct Bank Transfer / Raast',
            desc: 'Transfer directly to Meezan Bank / HBL or Raast ID.',
            instructions: 'Meezan Bank | A/C: 01020304050607 | Title: Aura Lifestyle PK | Raast ID: 03001234567'
        },
        easypaisa_jazzcash: {
            id: 'easypaisa_jazzcash',
            name: 'JazzCash / EasyPaisa',
            desc: 'Instant mobile wallet payment to our official merchant account.',
            instructions: 'Send payment to 0300-1234567 (Title: Aura Lifestyle) and mention order number in reference.'
        }
    }
};

// ==============================================================================
// UTILITY FUNCTIONS
// ==============================================================================

/**
 * Format numeric value to Pakistani Rupees display string (e.g. Rs. 1,499)
 */
function formatPKR(amount) {
    const num = Number(amount) || 0;
    return `Rs. ${num.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

/**
 * Format ISO timestamp into a readable Pakistani date/time
 */
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-PK', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Generate a unique Pakistani store order number, e.g., AURA-PK-84920
 */
function generateOrderNumber() {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    return `AURA-PK-${randomNum}`;
}

/**
 * Validate Pakistani phone numbers (03xx-xxxxxxx or 03xxxxxxxxx or +923xxxxxxxxx)
 */
function validatePakistaniPhone(phone) {
    if (!phone) return false;
    const cleanPhone = phone.replace(/[\s\-]/g, '');
    const regex = /^(03[0-9]{9}|\+923[0-9]{9}|923[0-9]{9})$/;
    return regex.test(cleanPhone);
}

/**
 * Debounce helper for instant search input
 */
function debounce(func, delay = 300) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Global Toast Notification system
 */
function showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type} animate-slide-in`;
    
    let icon = '✨';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <div class="toast-content">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('animate-fade-out');
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

// Export for module/global usage
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
    window.formatPKR = formatPKR;
    window.formatDate = formatDate;
    window.generateOrderNumber = generateOrderNumber;
    window.validatePakistaniPhone = validatePakistaniPhone;
    window.debounce = debounce;
    window.showToast = showToast;
}
