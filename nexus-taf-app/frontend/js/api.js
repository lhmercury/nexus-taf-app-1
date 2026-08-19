/**
 * NEXUS-TAF · Cliente de la API
 * Envoltorio sobre fetch() que centraliza la URL base, el token de sesión
 * y el manejo de errores. Namespace global: window.NexusApp.api
 */
(function () {
  'use strict';

  window.NexusApp = window.NexusApp || {};

  // window.NEXUS_CONFIG se define en app.html, ANTES de cargar este script.
  // Es lo único que hay que tocar para apuntar el frontend a otra API
  // (por ejemplo, la URL de tu backend ya desplegado en la nube).
  const CONFIG = window.NEXUS_CONFIG || { apiBase: 'http://localhost:4000/api' };

  const TOKEN_KEY = 'nexus_taf_token';
  const PREAUTH_KEY = 'nexus_taf_preauth';
  const USER_KEY = 'nexus_taf_user';

  // ---------- Sesión (localStorage) ----------
  const session = {
    getToken: () => localStorage.getItem(TOKEN_KEY),
    setToken: (t) => localStorage.setItem(TOKEN_KEY, t),
    clearToken: () => localStorage.removeItem(TOKEN_KEY),

    getPreAuth: () => localStorage.getItem(PREAUTH_KEY),
    setPreAuth: (t) => localStorage.setItem(PREAUTH_KEY, t),
    clearPreAuth: () => localStorage.removeItem(PREAUTH_KEY),

    getUser: () => {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    },
    setUser: (u) => localStorage.setItem(USER_KEY, JSON.stringify(u)),
    clearUser: () => localStorage.removeItem(USER_KEY),

    clearAll: () => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(PREAUTH_KEY);
      localStorage.removeItem(USER_KEY);
    }
  };

  /** Se dispara cuando el servidor responde 401 en un endpoint protegido. */
  let onUnauthorized = () => {};
  function setUnauthorizedHandler(fn) {
    onUnauthorized = fn;
  }

  /**
   * Envoltorio central sobre fetch().
   * @param {string} path            ej: '/tasks'
   * @param {object} options         { method, body, auth, isPreAuth, isFormData }
   */
  async function request(path, options = {}) {
    const { method = 'GET', body, auth = true, isPreAuth = false, isFormData = false } = options;

    const headers = {};
    if (!isFormData) headers['Content-Type'] = 'application/json';

    if (auth) {
      const token = isPreAuth ? session.getPreAuth() : session.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    let response;
    try {
      response = await fetch(CONFIG.apiBase + path, {
        method,
        headers,
        body: body ? (isFormData ? body : JSON.stringify(body)) : undefined
      });
    } catch (networkErr) {
      throw new Error(
        `No se pudo contactar la API en ${CONFIG.apiBase}. ¿Está el backend corriendo? (${networkErr.message})`
      );
    }

    if (response.status === 401 && auth) {
      onUnauthorized();
    }

    // Respuestas sin cuerpo (204)
    if (response.status === 204) return null;

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : await response.text();

    if (!response.ok) {
      const mensaje = (data && data.error) || `Error ${response.status} en ${path}`;
      throw new Error(mensaje);
    }

    return data;
  }

  // ---------- Auth ----------
  const auth = {
    login: (email, password) => request('/auth/login', { method: 'POST', auth: false, body: { email, password } }),
    verifyMfa: (code) => request('/auth/mfa', { method: 'POST', isPreAuth: true, body: { code } }),
    me: () => request('/auth/me'),
    register: (payload) => request('/auth/register', { method: 'POST', auth: false, body: payload }),
    devTotp: (email) => request(`/auth/dev/totp/${encodeURIComponent(email)}`, { auth: false })
  };

  // ---------- Usuarios / roles ----------
  const users = {
    list: () => request('/users'),
    roles: () => request('/roles'),
    updateRole: (id, rol) => request(`/users/${id}/role`, { method: 'PUT', body: { rol } })
  };

  // ---------- Tareas (Scrum) ----------
  const tasks = {
    list: (sprintId) => request('/tasks' + (sprintId ? `?sprint=${sprintId}` : '')),
    create: (payload) => request('/tasks', { method: 'POST', body: payload }),
    update: (id, payload) => request(`/tasks/${id}`, { method: 'PATCH', body: payload }),
    remove: (id) => request(`/tasks/${id}`, { method: 'DELETE' })
  };

  // ---------- Proyectos (Portal cliente) ----------
  const projects = {
    list: () => request('/projects'),
    status: (id) => request(`/projects/${id}/status`)
  };

  // ---------- Documentos ----------
  const documents = {
    list: () => request('/documents'),
    upload: (formData) => request('/documents/upload', { method: 'POST', isFormData: true, body: formData }),
    /**
     * Descarga autenticada: fetch a blob (no se puede usar un <a href>
     * plano porque el endpoint exige el header Authorization).
     */
    download: async (id, nombreSugerido) => {
      const token = session.getToken();
      const response = await fetch(`${CONFIG.apiBase}/documents/download/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo descargar el documento.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreSugerido || 'documento';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  };

  // ---------- BI ----------
  const bi = {
    reports: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request('/bi/reports' + (qs ? `?${qs}` : ''));
    }
  };

  window.NexusApp.api = { request, auth, users, tasks, projects, documents, bi, session, setUnauthorizedHandler, CONFIG };
})();
