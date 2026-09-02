// frontend/js/auth.js
//
// Load this AFTER config.js and BEFORE any script that calls the backend.
// Provides: getToken, setToken, clearToken, isLoggedIn, requireAuth,
// logout, and authFetch (a drop-in replacement for fetch that attaches
// the JWT and redirects to sign-in if the session is invalid/expired).

const AUTH_TOKEN_KEY = "legalai_token";
const AUTH_EMAIL_KEY = "legalai_email";

function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setSession(token, email) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  if (email) localStorage.setItem(AUTH_EMAIL_KEY, email);
}

function clearSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_EMAIL_KEY);
}

function getUserEmail() {
  return localStorage.getItem(AUTH_EMAIL_KEY);
}

function isLoggedIn() {
  return Boolean(getToken());
}

// Call at the top of any page that should be gated behind login.
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = "signin.html";
  }
}

function logout() {
  clearSession();
  window.location.href = "signin.html";
}

// Drop-in replacement for fetch() that attaches the Authorization header
// and redirects to sign-in if the token is missing/invalid/expired.
async function authFetch(url, options = {}) {
  const token = getToken();
  if (!token) {
    window.location.href = "signin.html";
    throw new Error("Not signed in.");
  }

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    clearSession();
    window.location.href = "signin.html";
    throw new Error("Session expired. Please sign in again.");
  }

  return response;
}