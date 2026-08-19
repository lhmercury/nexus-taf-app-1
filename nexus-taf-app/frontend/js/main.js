/**
 * NEXUS-TAF · Controlador principal del frontend.
 * Orquesta las pantallas de login/MFA, restaura la sesión y monta el
 * shell de la aplicación (sidebar + panel activo) según el rol.
 */
(function () {
  'use strict';
  window.NexusApp = window.NexusApp || {};
  const { api, ui } = window.NexusApp;

  const PANELES_POR_ROL = {
    Administrador: ['roles', 'scrum', 'portal', 'bi'],
    Directivo: ['bi', 'scrum', 'portal'],
    Consultor: ['scrum', 'portal'],
    Cliente: ['portal']
  };

  const META_PANEL = {
    roles: { titulo: 'Administración de roles', sub: 'Gestión estricta de perfiles y permisos · PostgreSQL', icon: 'i-users' },
    scrum: { titulo: 'Tablero Scrum', sub: 'Documentos NoSQL mutables en tiempo real · MongoDB', icon: 'i-kanban' },
    portal: { titulo: 'Portal del cliente', sub: 'Seguimiento de hitos y documentos del proyecto', icon: 'i-file' },
    bi: { titulo: 'Dashboard BI', sub: 'Consolidación de PostgreSQL (finanzas) y MongoDB (sprints)', icon: 'i-chart' }
  };

  const CUENTAS_DEMO = [
    { rol: 'Administrador', email: 'admin@consultorestaf.com', password: 'Admin123!' },
    { rol: 'Directivo', email: 'directivo@consultorestaf.com', password: 'Directivo123!' },
    { rol: 'Consultor', email: 'consultor@consultorestaf.com', password: 'Consultor123!' },
    { rol: 'Cliente', email: 'cliente@empresa-xyz.com', password: 'Cliente123!' }
  ];

  let usuarioActual = null;
  let panelActivo = null;

  // ---------- Elementos ----------
  const screens = {
    login: document.getElementById('screenLogin'),
    mfa: document.getElementById('screenMfa'),
    app: document.getElementById('appShell')
  };

  function mostrarPantalla(nombre) {
    Object.values(screens).forEach((el) => el.classList.remove('active'));
    screens[nombre].classList.add('active');
  }

  // ---------- Login ----------
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  let emailPendiente = '';

  document.getElementById('demoAccounts').innerHTML = CUENTAS_DEMO.map(
    (c) => `<button type="button" class="auth-demo-btn" data-email="${c.email}" data-password="${c.password}">
      <b>${c.rol}</b> — ${c.email}
    </button>`
  ).join('');

  document.querySelectorAll('.auth-demo-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.getElementById('loginEmail').value = btn.dataset.email;
      document.getElementById('loginPassword').value = btn.dataset.password;
    });
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.remove('show');

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const data = await api.auth.login(email, password);
      emailPendiente = email;

      if (data.mfaRequired) {
        api.session.setPreAuth(data.preAuthToken);
        mostrarPantalla('mfa');
        prepararPantallaMfa(email);
      } else {
        api.session.setToken(data.accessToken);
        api.session.setUser(data.usuario);
        await entrarAlApp(data.usuario);
      }
    } catch (err) {
      loginError.querySelector('span').textContent = err.message;
      loginError.classList.add('show');
    } finally {
      submitBtn.disabled = false;
    }
  });

  // ---------- MFA ----------
  const mfaForm = document.getElementById('mfaForm');
  const mfaError = document.getElementById('mfaError');
  const otpInputs = Array.from(document.querySelectorAll('.otp-box'));

  function prepararPantallaMfa(email) {
    document.getElementById('mfaEmail').textContent = email;
    otpInputs.forEach((inp) => (inp.value = ''));
    otpInputs[0].focus();
    mfaError.classList.remove('show');
  }

  otpInputs.forEach((input, idx) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/[^0-9]/g, '').slice(0, 1);
      if (input.value && idx < otpInputs.length - 1) otpInputs[idx + 1].focus();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) otpInputs[idx - 1].focus();
    });
    input.addEventListener('paste', (e) => {
      const texto = (e.clipboardData.getData('text') || '').replace(/[^0-9]/g, '');
      if (texto.length) {
        e.preventDefault();
        texto
          .slice(0, otpInputs.length)
          .split('')
          .forEach((d, i) => { if (otpInputs[i]) otpInputs[i].value = d; });
        otpInputs[Math.min(texto.length, otpInputs.length) - 1].focus();
      }
    });
  });

  document.getElementById('mfaBack').addEventListener('click', () => {
    api.session.clearPreAuth();
    mostrarPantalla('login');
  });

  document.getElementById('mfaDevBtn').addEventListener('click', async () => {
    try {
      const { codigoActual } = await api.auth.devTotp(emailPendiente);
      codigoActual.split('').forEach((d, i) => { if (otpInputs[i]) otpInputs[i].value = d; });
      otpInputs[otpInputs.length - 1].focus();
    } catch (err) {
      mfaError.querySelector('span').textContent = 'Código de prueba no disponible (¿backend en modo producción?).';
      mfaError.classList.add('show');
    }
  });

  mfaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    mfaError.classList.remove('show');

    const code = otpInputs.map((i) => i.value).join('');
    if (code.length !== otpInputs.length) {
      mfaError.querySelector('span').textContent = 'Ingresa los 6 dígitos del código.';
      mfaError.classList.add('show');
      return;
    }

    const submitBtn = mfaForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const data = await api.auth.verifyMfa(code);
      api.session.clearPreAuth();
      api.session.setToken(data.accessToken);
      api.session.setUser(data.usuario);
      await entrarAlApp(data.usuario);
    } catch (err) {
      mfaError.querySelector('span').textContent = err.message;
      mfaError.classList.add('show');
      otpInputs.forEach((inp) => (inp.value = ''));
      otpInputs[0].focus();
    } finally {
      submitBtn.disabled = false;
    }
  });

  // ---------- App shell ----------
  async function entrarAlApp(usuario) {
    usuarioActual = usuario;

    document.getElementById('sidebarUserName').textContent = `${usuario.nombre} ${usuario.apellido}`;
    document.getElementById('sidebarUserRole').textContent = usuario.rol;

    const paneles = PANELES_POR_ROL[usuario.rol] || [];
    const nav = document.getElementById('appNav');
    nav.innerHTML = paneles
      .map(
        (p) => `<button data-panel="${p}">
          <svg class="icon"><use href="#${META_PANEL[p].icon}" xlink:href="#${META_PANEL[p].icon}"/></svg>
          ${META_PANEL[p].titulo}
        </button>`
      )
      .join('');

    nav.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => activarPanel(btn.dataset.panel));
    });

    mostrarPantalla('app');
    document.getElementById('screenLogin').classList.remove('active');
    document.getElementById('screenMfa').classList.remove('active');
    document.getElementById('appShell').classList.add('active');

    if (paneles.length) {
      await activarPanel(paneles[0]);
    }
  }

  async function activarPanel(nombre) {
    panelActivo = nombre;
    document.querySelectorAll('#appNav button').forEach((b) => b.classList.toggle('active', b.dataset.panel === nombre));

    const meta = META_PANEL[nombre];
    document.getElementById('topbarTitle').textContent = meta.titulo;
    document.getElementById('topbarSub').textContent = meta.sub;

    const content = document.getElementById('panelContent');
    content.innerHTML = '';
    await window.NexusApp.panels[nombre].render(content, usuarioActual);
  }

  document.getElementById('logoutBtn').addEventListener('click', cerrarSesion);

  function cerrarSesion() {
    api.session.clearAll();
    usuarioActual = null;
    document.getElementById('appShell').classList.remove('active');
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    mostrarPantalla('login');
  }

  api.setUnauthorizedHandler(() => {
    ui.toast('Tu sesión expiró. Inicia sesión de nuevo.', 'error');
    cerrarSesion();
  });

  // ---------- Arranque: intenta restaurar sesión existente ----------
  (async function bootstrap() {
    const token = api.session.getToken();
    const usuarioGuardado = api.session.getUser();

    if (!token || !usuarioGuardado) {
      mostrarPantalla('login');
      return;
    }

    try {
      const perfil = await api.auth.me();
      await entrarAlApp({ ...usuarioGuardado, ...perfil });
    } catch (err) {
      api.session.clearAll();
      mostrarPantalla('login');
    }
  })();
})();
