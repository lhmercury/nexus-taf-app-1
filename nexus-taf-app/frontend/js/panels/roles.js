/**
 * Panel: Administración de roles (solo Administrador)
 * GET /api/users · GET /api/roles · PUT /api/users/:id/role
 */
(function () {
  'use strict';
  window.NexusApp = window.NexusApp || {};
  window.NexusApp.panels = window.NexusApp.panels || {};

  const { api } = window.NexusApp;
  const { ui } = window.NexusApp;

  let rolesDisponibles = [];

  async function render(container) {
    container.innerHTML = '<div class="state-msg"><div class="spinner"></div>Cargando usuarios…</div>';

    try {
      const [usuarios, roles] = await Promise.all([api.users.list(), api.users.roles()]);
      rolesDisponibles = roles;
      pintar(container, usuarios);
    } catch (err) {
      container.innerHTML = `<div class="state-msg">${ui.iconWarning()}${escapeHtml(err.message)}</div>`;
    }
  }

  function pintar(container, usuarios) {
    const filas = usuarios
      .map(
        (u) => `
      <tr data-id="${u.id}">
        <td><b>${escapeHtml(u.nombre)} ${escapeHtml(u.apellido)}</b></td>
        <td>${escapeHtml(u.email)}</td>
        <td>
          <select class="role-select" data-id="${u.id}">
            ${rolesDisponibles
              .map(
                (r) =>
                  `<option value="${escapeHtml(r.nombre_rol)}" ${r.nombre_rol === u.rol ? 'selected' : ''}>${escapeHtml(r.nombre_rol)}</option>`
              )
              .join('')}
          </select>
        </td>
        <td>${u.bloqueado ? '<span class="badge blocked">Bloqueado</span>' : '<span class="badge ok">Activo</span>'}</td>
        <td style="color:var(--text-soft); font-size:12.5px;">${u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleString('es-VE') : 'Sin registro'}</td>
      </tr>`
      )
      .join('');

    container.innerHTML = `
      <div class="card">
        <table class="data-table">
          <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Último acceso</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>`;

    container.querySelectorAll('.role-select').forEach((select) => {
      select.addEventListener('change', async () => {
        const id = select.dataset.id;
        const nuevoRol = select.value;
        select.disabled = true;
        try {
          await api.users.updateRole(id, nuevoRol);
          ui.toast(`Rol actualizado a "${nuevoRol}".`);
        } catch (err) {
          ui.toast(err.message, 'error');
        } finally {
          select.disabled = false;
        }
      });
    });
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  window.NexusApp.panels.roles = { render };
})();
