/* ==============================================================================
   LaVIDA — Supabase Storage & Media Asset Helper
   Handles image uploads to Supabase Storage bucket 'product-images'
   ============================================================================== */

import { getSupabaseClient } from './supabase-client.js';
import { APP_CONFIG } from './config.js';

export async function uploadProductImage(file) {
  if (!file) {
    throw new Error('No image file selected.');
  }

  // Max 5MB check
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image size must be less than 5MB.');
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('File must be an image (JPEG, PNG, WebP, AVIF, GIF).');
  }

  const supabase = await getSupabaseClient();

  if (supabase) {
    const fileExt = file.name.split('.').pop();
    const fileName = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `products/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(APP_CONFIG.storageBucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.warn('Storage upload error:', uploadError);
      throw new Error(`Failed to upload to Supabase Storage: ${uploadError.message}`);
    }

    const { data } = supabase.storage
      .from(APP_CONFIG.storageBucketName)
      .getPublicUrl(filePath);

    return data.publicUrl;
  } else {
    // Return a base64 Data URL for offline preview / demo storage
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }
}
