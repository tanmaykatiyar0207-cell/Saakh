/* ================================================================
   SAAKH — Authentication & Global State
   Handles: Supabase auth state, login/signup modals, and dynamic 
   store name propagation across pages.
================================================================ */

window.currentUser = null;
let supabase = null;

const guestStateUI = document.getElementById('auth-guest-state');
const userStateUI  = document.getElementById('auth-user-state');
const userEmailTag  = document.getElementById('user-display-email');
const authModal    = document.getElementById('auth-modal');
const authForm     = document.getElementById('auth-form');
const authEmailInput = document.getElementById('auth-email');
const authPassInput  = document.getElementById('auth-password');
const authShopInput  = document.getElementById('auth-shop-name');
const authShopGroup  = document.getElementById('auth-shop-group');
const authErrorEl  = document.getElementById('auth-error');
const authTitle    = document.getElementById('auth-modal-title');
const authDesc     = document.getElementById('auth-modal-desc');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authSwitchBtn = document.getElementById('auth-switch-mode-btn');
const authSwitchText = document.getElementById('auth-switch-text');
const closeModalBtn  = document.getElementById('auth-modal-close-btn');

const navLoginBtn    = document.getElementById('nav-login-btn');
const navRegisterBtn = document.getElementById('nav-register-btn');
const navLogoutBtn   = document.getElementById('nav-logout-btn');

let isSignUpMode = false;
window.authCallbackOnSuccess = null;

function initSupabase() {
  const cfg = window.SAAKH_SUPABASE || {};
  const url = (cfg.url || '').trim();
  const anonKey = (cfg.anonKey || '').trim();
  const configured =
    url &&
    anonKey &&
    !url.includes('YOUR_SUPABASE') &&
    !anonKey.includes('YOUR_SUPABASE');

  if (!configured) {
    console.warn(
      '[Saakh] Add your Supabase URL and anon key in supabase-config.js'
    );
    return null;
  }

  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('[Saakh] Supabase JS SDK failed to load.');
    return null;
  }

  return window.supabase.createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

try {
  supabase = initSupabase();
} catch (err) {
  console.error('[Saakh] Failed to initialize Supabase:', err);
  supabase = null;
}

function setAuthError(message) {
  if (!authErrorEl) return;
  if (!message) {
    authErrorEl.hidden = true;
    authErrorEl.textContent = '';
    return;
  }
  authErrorEl.hidden = false;
  authErrorEl.textContent = message;
}

function resetAuthSubmitLabel() {
  if(authSubmitBtn) {
    authSubmitBtn.textContent = isSignUpMode ? 'Register Account' : 'Continue';
  }
}

function updateDynamicShopNames(shopName) {
  const defaultName = "Your business";
  const displayValue = shopName || defaultName;
  document.querySelectorAll('.user-shop-name-display').forEach(el => {
    el.textContent = displayValue;
  });
}

function notifyUser(msg, type = 'info') {
  if (window.showToast) {
    window.showToast(msg, type);
  } else if (window.showSimpleToast) {
    window.showSimpleToast(msg);
  } else {
    alert(msg);
  }
}

function updateAuthState(user) {
  window.currentUser = user;
  if (user) {
    if (guestStateUI) guestStateUI.style.display = 'none';
    if (userStateUI) userStateUI.style.display = 'flex';
    if (userEmailTag) userEmailTag.textContent = user.user_metadata?.shop_name || user.email || 'Signed in';
    updateDynamicShopNames(user.user_metadata?.shop_name || 'Your business');
  } else {
    if (guestStateUI) guestStateUI.style.display = 'flex';
    if (userStateUI) userStateUI.style.display = 'none';
    updateDynamicShopNames('Your business');
  }
  
  // Dispatch an event so page-specific scripts (like app.js) can react
  window.dispatchEvent(new CustomEvent('saakh-auth-changed', { detail: { user } }));
}

async function restoreSession() {
  if (!supabase) return;
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('[Saakh] getSession error:', error.message);
    return;
  }
  updateAuthState(data.session?.user ?? null);

  supabase.auth.onAuthStateChange((_event, session) => {
    updateAuthState(session?.user ?? null);
  });
}

try {
  restoreSession();
} catch (err) {
  console.error('[Saakh] Failed to restore session:', err);
}

window.openAuthModal = function(signUp = false, callback = null) {
  isSignUpMode = signUp;
  window.authCallbackOnSuccess = callback;
  setAuthError('');
  
  if (!authModal) return;

  if (isSignUpMode) {
    if (authTitle) authTitle.textContent = 'Create your Saakh Account';
    if (authDesc) authDesc.textContent =
      'Save your financial profile so you can re-download your statement later.';
    if (authSubmitBtn) authSubmitBtn.textContent = 'Register Account';
    if (authSwitchText) authSwitchText.textContent = 'Already have an account?';
    if (authSwitchBtn) authSwitchBtn.textContent = 'Sign In';
    if (authPassInput) authPassInput.setAttribute('autocomplete', 'new-password');
    if (authShopGroup) authShopGroup.style.display = 'block';
  } else {
    if (authTitle) authTitle.textContent = 'Sign In to Saakh';
    if (authDesc) authDesc.textContent =
      'Sign in to reopen a saved profile and download your statement again.';
    if (authSubmitBtn) authSubmitBtn.textContent = 'Continue';
    if (authSwitchText) authSwitchText.textContent = 'New to Saakh?';
    if (authSwitchBtn) authSwitchBtn.textContent = 'Create an account';
    if (authPassInput) authPassInput.setAttribute('autocomplete', 'current-password');
    if (authShopGroup) authShopGroup.style.display = 'none';
  }

  if (authModal) {
    authModal.style.display = ''; // Clear inline styles if any exist
    authModal.classList.add('show');
    if (authEmailInput) authEmailInput.focus();
  }
};

window.closeAuthModal = function() {
  if (authModal) {
    authModal.classList.remove('show');
  }
  if (authForm) authForm.reset();
  setAuthError('');
  window.authCallbackOnSuccess = null;
  resetAuthSubmitLabel();
};

if (navLoginBtn) {
  navLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.openAuthModal(false);
  });
}
if (navRegisterBtn) {
  navRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.openAuthModal(true);
  });
}
if (closeModalBtn) {
  closeModalBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.closeAuthModal();
  });
}

if (authModal) {
  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) window.closeAuthModal();
  });
}

if (authSwitchBtn) {
  authSwitchBtn.addEventListener('click', () => {
    window.openAuthModal(!isSignUpMode, window.authCallbackOnSuccess);
  });
}

if (authForm) {
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = authEmailInput.value.trim();
    const password = authPassInput.value;
    const shopName = authShopInput ? authShopInput.value.trim() : '';

    if (!email) {
        setAuthError('Email Address is required.');
        return;
    }
    if (!password) {
        setAuthError('Password is required.');
        return;
    }
    if (isSignUpMode && !shopName) {
        setAuthError('Store or Shop Name is required.');
        return;
    }

    if (!supabase) {
      setAuthError(
        'Supabase is not configured. Add your project URL and anon key in supabase-config.js.'
      );
      return;
    }

    if (password.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    if(authSubmitBtn) {
        authSubmitBtn.disabled = true;
        authSubmitBtn.textContent = isSignUpMode ? 'Signing Up...' : 'Signing In...';
    }
    setAuthError('');

    try {
      if (isSignUpMode) {
        const { data, error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: {
                    shop_name: shopName
                }
            }
        });
        if (error) throw error;

        if (data.session?.user) {
          const afterAuth = window.authCallbackOnSuccess;
          updateAuthState(data.session.user);
          window.closeAuthModal();
          notifyUser('Account created — you are signed in.', 'success');
          if (afterAuth) afterAuth();
          
          // Redirect to dashboard if not already on it
          if (!window.location.pathname.includes('dashboard.html') && !window.location.pathname.includes('action-center.html')) {
            setTimeout(() => {
              window.location.href = 'dashboard.html';
            }, 800);
          }
        } else {
          // Email confirmation is required by Supabase project settings
          window.closeAuthModal();
          notifyUser('Account created! Please check your email to verify your account before logging in.', 'success');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        const afterAuth = window.authCallbackOnSuccess;
        updateAuthState(data.user);
        window.closeAuthModal();
        notifyUser('Signed in successfully!', 'success');
        if (afterAuth) afterAuth();

        // Redirect to dashboard if not already on it
        if (!window.location.pathname.includes('dashboard.html') && !window.location.pathname.includes('action-center.html')) {
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 800);
        }
      }
    } catch (err) {
      setAuthError(err.message || 'Authentication failed. Please try again.');
      resetAuthSubmitLabel();
    } finally {
      if(authSubmitBtn) authSubmitBtn.disabled = false;
    }
  });
}

if (navLogoutBtn) {
  navLogoutBtn.addEventListener('click', async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        notifyUser(error.message, 'error');
        return;
      }
    }
    updateAuthState(null);
    notifyUser('Logged out successfully.', 'info');
  });
}

// Check query parameters to automatically open auth modal
function checkQueryAuth() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('triggerLogin') === 'true') {
    setTimeout(() => {
      if (window.currentUser) {
        window.location.href = 'dashboard.html';
      } else if (window.openAuthModal) {
        window.openAuthModal(false);
      }
    }, 800);
  }
}
try {
  checkQueryAuth();
} catch (err) {
  console.error('[Saakh] checkQueryAuth error:', err);
}


