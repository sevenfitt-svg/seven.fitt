(function (w) {
  'use strict';
  const TOKEN_KEY = 'sevenfitt_access_token_v1';
  const API_KEY = 'sevenfitt_api_base_v1';

  function defaultApiBase() {
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return 'http://localhost:3000';
    return 'https://api.sevenfitt.com';
  }

  function apiBase() {
    return (localStorage.getItem(API_KEY) || defaultApiBase()).replace(/\/$/, '');
  }

  function setApiBase(url) {
    const value = String(url || '').trim().replace(/\/$/, '');
    if (value) localStorage.setItem(API_KEY, value);
    else localStorage.removeItem(API_KEY);
  }

  function token() { return localStorage.getItem(TOKEN_KEY) || ''; }
  function setToken(value) {
    if (value) localStorage.setItem(TOKEN_KEY, value);
    else localStorage.removeItem(TOKEN_KEY);
  }

  async function api(path, options) {
    const opts = Object.assign({}, options || {});
    const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    if (token()) headers.Authorization = 'Bearer ' + token();
    opts.headers = headers;
    if (opts.body && typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);

    let res;
    try {
      res = await fetch(apiBase() + path, opts);
    } catch (e) {
      const err = new Error('API_UNREACHABLE');
      err.cause = e;
      throw err;
    }

    let data = null;
    const text = await res.text();
    if (text) {
      try { data = JSON.parse(text); } catch { data = text; }
    }
    if (!res.ok) {
      if (res.status === 401) setToken('');
      const message = data && (data.message || data.error) ? data.message || data.error : ('HTTP_' + res.status);
      const err = new Error(Array.isArray(message) ? message.join(', ') : String(message));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function safeNext(value, fallback) {
    const v = String(value || '');
    if (!v || /^https?:/i.test(v) || v.startsWith('//')) return fallback;
    return v;
  }

  function roleLabel(role) {
    return role === 'OWNER' ? 'مالک Seven.fitt' : role === 'ADMIN' ? 'مدیر' : role === 'LAB_STAFF' ? 'مسئول آزمایشگاه' : role === 'COACH' ? 'مربی' : role === 'ATHLETE' ? 'ورزشکار' : role;
  }

  async function login(phone, password) {
    const out = await api('/auth/login', { method: 'POST', body: { phone, password } });
    setToken(out.accessToken);
    return out.user;
  }

  function logout(redirect) {
    setToken('');
    if (redirect) location.href = redirect;
  }

  async function me() { return api('/auth/me'); }

  async function requireCoach(loginUrl) {
    if (location.protocol === 'file:') throw new Error('SITE_ONLY');
    if (!token()) {
      const next = encodeURIComponent(location.pathname + location.search + location.hash);
      location.replace((loginUrl || '/coach/login.html') + '?next=' + next);
      return null;
    }
    try {
      const user = await me();
      if (!['OWNER', 'ADMIN', 'COACH'].includes(user.role)) throw new Error('COACH_ACCESS_REQUIRED');
      return user;
    } catch (e) {
      setToken('');
      const next = encodeURIComponent(location.pathname + location.search + location.hash);
      location.replace((loginUrl || '/coach/login.html') + '?next=' + next);
      return null;
    }
  }



  async function apiForm(path, formData, options) {
    const opts = Object.assign({}, options || {});
    const headers = Object.assign({}, opts.headers || {});
    if (token()) headers.Authorization = 'Bearer ' + token();
    opts.method = opts.method || 'POST';
    opts.headers = headers;
    opts.body = formData;
    let res;
    try { res = await fetch(apiBase() + path, opts); }
    catch (e) { const err = new Error('API_UNREACHABLE'); err.cause = e; throw err; }
    const text = await res.text();
    let data = text;
    if (text) { try { data = JSON.parse(text); } catch {} }
    if (!res.ok) {
      if (res.status === 401) setToken('');
      const message = data && (data.message || data.error) ? data.message || data.error : ('HTTP_' + res.status);
      const err = new Error(Array.isArray(message) ? message.join(', ') : String(message));
      err.status = res.status; err.data = data; throw err;
    }
    return data;
  }

  async function apiBlob(path, options) {
    const opts = Object.assign({}, options || {});
    const headers = Object.assign({}, opts.headers || {});
    if (token()) headers.Authorization = 'Bearer ' + token();
    opts.headers = headers;
    let res;
    try { res = await fetch(apiBase() + path, opts); }
    catch (e) { const err = new Error('API_UNREACHABLE'); err.cause = e; throw err; }
    if (!res.ok) {
      if (res.status === 401) setToken('');
      let message = 'HTTP_' + res.status;
      try { const data = await res.json(); message = data?.message || data?.error || message; } catch {}
      const err = new Error(Array.isArray(message) ? message.join(', ') : String(message));
      err.status = res.status;
      throw err;
    }
    return res.blob();
  }

  async function requireRoles(roles, loginUrl) {
    if (location.protocol === 'file:') throw new Error('SITE_ONLY');
    if (!token()) {
      const next = encodeURIComponent(location.pathname + location.search + location.hash);
      location.replace((loginUrl || '/coach/login.html') + '?next=' + next);
      return null;
    }
    try {
      const user = await me();
      if (!roles.includes(user.role)) throw new Error('ROLE_ACCESS_REQUIRED');
      return user;
    } catch (e) {
      setToken('');
      const next = encodeURIComponent(location.pathname + location.search + location.hash);
      location.replace((loginUrl || '/coach/login.html') + '?next=' + next);
      return null;
    }
  }

  async function requireAthlete(loginUrl) {
    return requireRoles(['ATHLETE'], loginUrl || '/student/login.html');
  }

  async function requireLabStaff(loginUrl) {
    return requireRoles(['OWNER', 'ADMIN', 'LAB_STAFF'], loginUrl || '/coach/login.html');
  }

  w.SevenFitt = {
    api, apiForm, apiBlob, apiBase, setApiBase,
    auth: { token, setToken, login, logout, me, requireCoach, requireAthlete, requireLabStaff, requireRoles, safeNext, roleLabel }
  };
})(window);
