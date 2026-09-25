/* ==============================================================================
   LaVIDA — Supabase & Application Configuration
   Safe environment configuration management without hard-coding secrets.
   ============================================================================== */

const CONFIG_STORAGE_KEY = 'lavida_supabase_config';

export function getSupabaseConfig() {
  // 1. Check window.ENV (for deployments with script tags / env injection)
  if (window.ENV && window.ENV.SUPABASE_URL && window.ENV.SUPABASE_ANON_KEY) {
    return {
      url: window.ENV.SUPABASE_URL.trim(),
      anonKey: window.ENV.SUPABASE_ANON_KEY.trim(),
      source: 'window.ENV'
    };
  }

  // 2. Check localStorage (allows user/admin to connect their project dynamically)
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) {
        return {
          url: parsed.url.trim(),
          anonKey: parsed.anonKey.trim(),
          source: 'localStorage'
        };
      }
    }
  } catch (err) {
    console.warn('Failed to read config from localStorage:', err);
  }

  // 3. Fallback / Unconfigured state
  return {
    url: '',
    anonKey: '',
    source: 'unconfigured'
  };
}

export function isSupabaseConfigured() {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.anonKey && config.url.startsWith('https://'));
}

export function saveSupabaseConfig(url, anonKey) {
  if (!url || !anonKey) {
    throw new Error('Both Supabase URL and Anon Key are required.');
  }

  if (!url.startsWith('https://')) {
    throw new Error('Supabase URL must start with https://');
  }

  const payload = {
    url: url.trim(),
    anonKey: anonKey.trim(),
    updatedAt: new Date().toISOString()
  };

  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(payload));
  return true;
}

export function clearSupabaseConfig() {
  localStorage.removeItem(CONFIG_STORAGE_KEY);
}

export const APP_CONFIG = {
  restaurantName: 'LaVIDA',
  tagline: 'Food, Made to Crave',
  subTagline: 'Good food. No complicated decisions.',
  currencySymbol: '$',
  deliveryFeeStandard: 3.99,
  freeDeliveryThreshold: 35.00,
  taxRate: 0.08, // 8% estimated local sales tax
  supportEmail: 'support@eatlavida.com',
  supportPhone: '+1 (800) 555-VIDA',
  storageBucketName: 'product-images'
};
