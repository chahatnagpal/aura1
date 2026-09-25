/* ==============================================================================
   LaVIDA — UI Utilities, Toasts, Modals, Dynamic Headers & Supabase Config Modal
   ============================================================================== */

import { getCurrentUser, signOut, isAdmin } from './auth.js';
import { isSupabaseConfigured, getSupabaseConfig, saveSupabaseConfig, clearSupabaseConfig } from './config.js';
import { testSupabaseConnection } from './supabase-client.js';

/**
 * Show a toast notification
 */
export function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconSvg = {
    success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>',
    danger: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
  }[type] || '';

  toast.innerHTML = `
    <span style="display:flex;align-items:center;">${iconSvg}</span>
    <span style="flex:1;">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

/**
 * Modal dialog controls
 */
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/**
 * Initialize Header & Auth State in Navigation
 */
export async function initHeaderAuth() {
  const userContainer = document.getElementById('headerUserArea');
  const mobileUserContainer = document.getElementById('drawerUserArea');
  if (!userContainer) return;

  const user = await getCurrentUser();
  const admin = await isAdmin();

  if (user) {
    const displayName = user.profile?.full_name || user.email?.split('@')[0] || 'Member';
    const initial = displayName.charAt(0).toUpperCase();

    userContainer.innerHTML = `
      <div class="user-menu-wrapper" id="userMenuWrapper">
        <button class="user-profile-btn" id="userProfileBtn">
          <div class="user-avatar">${initial}</div>
          <span style="max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${displayName}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <div class="user-dropdown" id="userDropdown">
          <div style="padding: 6px 12px; font-size: 0.75rem; color: var(--text-subtle);">Signed in as<br><strong style="color: var(--text-main);">${user.email}</strong></div>
          <hr>
          <a href="account.html">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            My Account & Orders
          </a>
          ${admin ? `
            <a href="admin.html" style="color: var(--color-primary); font-weight: 700;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              Admin Dashboard
            </a>
          ` : ''}
          <hr>
          <button id="btnSignOutDropdown" style="color: var(--color-danger);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            Sign Out
          </button>
        </div>
      </div>
    `;

    // Dropdown toggle
    const profileBtn = document.getElementById('userProfileBtn');
    const dropdown = document.getElementById('userDropdown');
    if (profileBtn && dropdown) {
      profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
      });
      document.addEventListener('click', () => dropdown.classList.remove('show'));
    }

    const signOutBtn = document.getElementById('btnSignOutDropdown');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', async () => {
        await signOut();
        showToast('Signed out successfully.', 'info');
        setTimeout(() => window.location.href = 'index.html', 500);
      });
    }

    if (mobileUserContainer) {
      mobileUserContainer.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:8px; padding-top:12px; border-top:1px solid var(--color-light-200);">
          <div style="font-size:0.85rem; font-weight:700;">${displayName}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${user.email}</div>
          <a href="account.html" class="btn btn-outline btn-sm">My Account & Orders</a>
          ${admin ? '<a href="admin.html" class="btn btn-secondary btn-sm">Admin Dashboard</a>' : ''}
          <button id="btnMobileSignOut" class="btn btn-dark btn-sm" style="margin-top:4px;">Sign Out</button>
        </div>
      `;
      document.getElementById('btnMobileSignOut')?.addEventListener('click', async () => {
        await signOut();
        window.location.href = 'index.html';
      });
    }

  } else {
    userContainer.innerHTML = `
      <a href="auth.html" class="btn btn-primary btn-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        Sign In
      </a>
    `;

    if (mobileUserContainer) {
      mobileUserContainer.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:8px; padding-top:12px; border-top:1px solid var(--color-light-200);">
          <a href="auth.html" class="btn btn-primary" style="width:100%;">Sign In / Register</a>
        </div>
      `;
    }
  }
}

/**
 * Setup In-App Supabase Connection Modal
 */
export function initSupabaseModal() {
  // Inject Supabase Settings Modal if missing
  if (!document.getElementById('supabaseConfigModal')) {
    const modalHtml = `
      <div class="modal-overlay" id="supabaseConfigModal">
        <div class="modal-container" style="max-width: 500px;">
          <div class="modal-header">
            <h3 style="font-size:1.15rem; display:flex; align-items:center; gap:8px;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#3ECF8E"><path d="M12 2L2 19.7778H10.6667L8.5 22L22 7.77778H13.3333L15.5 2H12Z"/></svg>
              Supabase Backend Setup
            </h3>
            <button class="btn-icon" onclick="window.LaVIDAUI.closeModal('supabaseConfigModal')">✕</button>
          </div>
          <div class="modal-body">
            <p class="text-sm text-muted" style="margin-bottom: 16px;">
              Connect your live Supabase project to sync database records, authentication, storage & orders. You can find these in your Supabase Dashboard &gt; Project Settings &gt; API.
            </p>
            <form id="supabaseConfigForm">
              <div class="form-group">
                <label class="form-label" for="cfgSupabaseUrl">Project URL (SUPABASE_URL)</label>
                <input type="url" id="cfgSupabaseUrl" class="form-input" placeholder="https://xyzcompany.supabase.co" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="cfgSupabaseKey">Anon Public Key (SUPABASE_ANON_KEY)</label>
                <input type="password" id="cfgSupabaseKey" class="form-input" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." required>
                <span class="form-help">Safe to use in the browser client. Never enter your secret service_role key here.</span>
              </div>
              <div id="cfgStatusMessage" style="margin-top: 12px; font-size: 0.85rem;"></div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline btn-sm" id="btnTestSupabase">Test Connection</button>
            <button type="button" class="btn btn-primary btn-sm" id="btnSaveSupabase">Save & Connect</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Populate current config
    const currentConfig = getSupabaseConfig();
    if (currentConfig.url) {
      document.getElementById('cfgSupabaseUrl').value = currentConfig.url;
    }
    if (currentConfig.anonKey) {
      document.getElementById('cfgSupabaseKey').value = currentConfig.anonKey;
    }

    // Handlers
    document.getElementById('btnTestSupabase')?.addEventListener('click', async () => {
      const url = document.getElementById('cfgSupabaseUrl').value.trim();
      const key = document.getElementById('cfgSupabaseKey').value.trim();
      const statusEl = document.getElementById('cfgStatusMessage');

      statusEl.innerHTML = '<span class="text-muted">Testing connection...</span>';
      const res = await testSupabaseConnection(url, key);

      if (res.success) {
        statusEl.innerHTML = `<span style="color:var(--color-success); font-weight:700;">✅ ${res.message || res.warning}</span>`;
      } else {
        statusEl.innerHTML = `<span style="color:var(--color-danger); font-weight:700;">❌ Connection failed: ${res.message}</span>`;
      }
    });

    document.getElementById('btnSaveSupabase')?.addEventListener('click', async () => {
      const url = document.getElementById('cfgSupabaseUrl').value.trim();
      const key = document.getElementById('cfgSupabaseKey').value.trim();
      try {
        saveSupabaseConfig(url, key);
        showToast('Supabase configuration saved! Reloading application...', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });
  }
}

/**
 * Mobile navigation setup
 */
export function initMobileNav() {
  const toggleBtn = document.getElementById('mobileNavToggle');
  const drawer = document.getElementById('mobileDrawer');
  const backdrop = document.getElementById('mobileDrawerBackdrop');
  const closeBtn = document.getElementById('closeMobileDrawer');

  if (toggleBtn && drawer && backdrop) {
    toggleBtn.addEventListener('click', () => {
      drawer.classList.add('open');
      backdrop.classList.add('active');
    });

    const closeDrawer = () => {
      drawer.classList.remove('open');
      backdrop.classList.remove('active');
    };

    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    backdrop.addEventListener('click', closeDrawer);
  }
}

window.LaVIDAUI = {
  showToast,
  openModal,
  closeModal,
  openSupabaseSettings: () => openModal('supabaseConfigModal')
};

document.addEventListener('DOMContentLoaded', () => {
  initHeaderAuth();
  initSupabaseModal();
  initMobileNav();
});
