/* ==============================================================================
   LaVIDA — Authentication & Profile Management
   Handles Supabase Auth (Sign Up, Sign In, Sign Out, Roles, Route Guards)
   ============================================================================== */

import { getSupabaseClient } from './supabase-client.js';
import { isSupabaseConfigured } from './config.js';

const MOCK_AUTH_STORAGE_KEY = 'lavida_mock_session';

/**
 * Register a new user
 */
export async function signUp({ email, password, fullName, phone, role = 'customer' }) {
  if (!email || !password) {
    throw new Error('Email and password are required.');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const supabase = await getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || '',
          phone: phone || '',
          role: role
        }
      }
    });

    if (error) throw error;

    // Also ensure profiles table record exists
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: email,
        full_name: fullName || '',
        phone: phone || '',
        role: role
      });
    }

    return { user: data.user, session: data.session };
  } else {
    // Demo Mock Fallback
    const mockUser = {
      id: 'mock-usr-' + Date.now(),
      email,
      user_metadata: { full_name: fullName, phone, role }
    };
    const mockProfile = {
      id: mockUser.id,
      email,
      full_name: fullName,
      phone,
      role
    };

    localStorage.setItem(MOCK_AUTH_STORAGE_KEY, JSON.stringify({ user: mockUser, profile: mockProfile }));
    return { user: mockUser, session: { user: mockUser } };
  }
}

/**
 * Sign in existing user
 */
export async function signIn({ email, password }) {
  if (!email || !password) {
    throw new Error('Please enter both email and password.');
  }

  const supabase = await getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return { user: data.user, session: data.session };
  } else {
    // Demo Mock Fallback: support demo accounts
    let role = 'customer';
    let fullName = 'Demo Customer';
    let phone = '+1 (555) 234-5678';

    if (email.toLowerCase().includes('admin')) {
      role = 'admin';
      fullName = 'LaVIDA Restaurant Admin';
      phone = '+1 (800) 555-ADMIN';
    }

    const mockUser = {
      id: 'mock-usr-1',
      email,
      user_metadata: { full_name: fullName, phone, role }
    };
    const mockProfile = {
      id: mockUser.id,
      email,
      full_name: fullName,
      phone,
      role
    };

    localStorage.setItem(MOCK_AUTH_STORAGE_KEY, JSON.stringify({ user: mockUser, profile: mockProfile }));
    return { user: mockUser, session: { user: mockUser } };
  }
}

/**
 * Sign out current user
 */
export async function signOut() {
  const supabase = await getSupabaseClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  localStorage.removeItem(MOCK_AUTH_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('lavida:auth_change', { detail: { user: null } }));
}

/**
 * Get current session and user profile
 */
export async function getCurrentUser() {
  const supabase = await getSupabaseClient();

  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return null;

    // Fetch profile details
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    return {
      ...session.user,
      profile: profile || {
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.user_metadata?.full_name || '',
        phone: session.user.user_metadata?.phone || '',
        role: session.user.user_metadata?.role || 'customer'
      }
    };
  } else {
    // Demo Mock Fallback
    const saved = localStorage.getItem(MOCK_AUTH_STORAGE_KEY);
    if (saved) {
      try {
        const { user, profile } = JSON.parse(saved);
        return { ...user, profile };
      } catch (e) {
        return null;
      }
    }
    return null;
  }
}

/**
 * Check if the active user is an admin
 */
export async function isAdmin() {
  const user = await getCurrentUser();
  return Boolean(user && user.profile && user.profile.role === 'admin');
}

/**
 * Update user profile
 */
export async function updateProfile({ fullName, phone, avatarUrl }) {
  const user = await getCurrentUser();
  if (!user) throw new Error('You must be logged in to update your profile.');

  const supabase = await getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone: phone,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // Demo Mock Fallback
    const saved = JSON.parse(localStorage.getItem(MOCK_AUTH_STORAGE_KEY) || '{}');
    if (saved.profile) {
      saved.profile.full_name = fullName;
      saved.profile.phone = phone;
      if (avatarUrl) saved.profile.avatar_url = avatarUrl;
      localStorage.setItem(MOCK_AUTH_STORAGE_KEY, JSON.stringify(saved));
      return saved.profile;
    }
  }
}

/**
 * Route Guard: Requires authentication
 */
export async function requireAuth(redirectUrl = 'auth.html') {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = `${redirectUrl}?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return null;
  }
  return user;
}

/**
 * Route Guard: Requires admin role
 */
export async function requireAdmin(redirectUrl = 'auth.html') {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = `${redirectUrl}?returnUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return null;
  }

  if (user.profile.role !== 'admin') {
    alert('Access Denied: You must be an administrator to access this area.');
    window.location.href = 'index.html';
    return null;
  }

  return user;
}
