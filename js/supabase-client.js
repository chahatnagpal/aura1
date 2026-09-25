/* ==============================================================================
   LaVIDA — Supabase Client Wrapper
   Initializes and provides the Supabase JS v2 client instance
   ============================================================================== */

import { getSupabaseConfig, isSupabaseConfigured } from './config.js';

let supabaseInstance = null;

export async function getSupabaseClient() {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  const { url, anonKey } = getSupabaseConfig();

  try {
    // 1. Check if window.supabase exists (loaded via script CDN)
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      supabaseInstance = window.supabase.createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      return supabaseInstance;
    }

    // 2. Dynamic import fallback
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return supabaseInstance;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    return null;
  }
}

export async function testSupabaseConnection(customUrl, customKey) {
  const url = customUrl || getSupabaseConfig().url;
  const anonKey = customKey || getSupabaseConfig().anonKey;

  if (!url || !anonKey) {
    return { success: false, message: 'Missing URL or Anon Key' };
  }

  try {
    let createClientFn;
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      createClientFn = window.supabase.createClient;
    } else {
      const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      createClientFn = mod.createClient;
    }

    const testClient = createClientFn(url, anonKey);
    const { data, error } = await testClient.from('categories').select('id').limit(1);

    if (error) {
      // If table doesn't exist yet, but connection succeeded
      if (error.code === '42P01') {
        return {
          success: true,
          warning: 'Connected to Supabase, but tables have not been created yet! Please run schema.sql in your Supabase SQL Editor.'
        };
      }
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Successfully connected to Supabase database!' };
  } catch (err) {
    return { success: false, message: err.message || 'Connection failed' };
  }
}
