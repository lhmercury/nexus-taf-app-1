/**
 * Panel: Tablero Scrum (Administrador / Consultor / Directivo en solo lectura visual)
 * GET /api/tasks · POST /api/tasks · PATCH /api/tasks/:id
 */
(function () {
  'use strict';
  window.NexusApp = window.NexusApp || {};
  window.NexusApp.panels = window.NexusApp.panels || {};

  const { api, ui } = window.NexusApp;

  const COLUMNAS = [
    { estado: 'por_hacer', titulo: 'Por hacer' },
    { estado: 'en_progreso', titulo: 'En progreso' },
    { estado: 'hecho', titulo: 'Hecho' }
  ];

  let sprintIdActual = null;
  let tareasActuales = [];
  let puedeEditar = false;

  async function render(container, usuario) {
    puedeEditar = ['Administrador', 'Consultor'].includes(usuario.rol);
    container.innerHTML = '<div class="state-msg"><div class="spinner"></div>Cargando tablero…</div>';

    try {
      const { sprintId, tareas } = await api.tasks.list();
      sprintIdActual = sprintId;
      tareasActuales = tareas;

      if (!sprintId) {
        container.innerHTML = `<div class="state-msg">${ui.iconInfo()}No hay un sprint activo todavía. Crea uno desde la base de datos (colección <code>sprints</code>) para empezar a trabajar aquí.</div>`;
        return;
      }

      pintar(container);
    } catch (err) {
      container.innerHTML = `<div class="state-msg">${ui.iconWarning()}${escapeHtml(err.message)}</div>`;
    }
  }

  function pintar(container) {
    container.innerHTML = `
      <div class="kanban">
        ${COLUMNAS.map((col) => columnaHtml(col)).join('')}
      </div>`;

    COLUMNAS.forEach((col) => {
      const colEl = container.querySelector(`[data-col="${col.estado}"]`);

      colEl.addEventListener('dragover', (e) => {
        if (!puedeEditar) return;
        e.preventDefault();
        colEl.classList.add('dragover');
      });
      colEl.addEventListener('dragleave', () => colEl.classList.remove('dragover'));
      colEl.addEventListener('drop', async (e) => {
        e.preventDefault();
        colEl.classList.remove('dragover');
        if (!puedeEditar) return;

        const id = e.dataTransfer.getData('text/plain');
        const tarea = tareasActuales.find((t) => t._id === id);
        if (!tarea || tarea.estado === col.estado) return;

        const estadoAnterior = tarea.estado;
        tarea.estado = col.estado;
        pintar(container);

        try {
          await api.tasks.update(id, { estado: col.estado });
        } catch (err) {
          tarea.estado = estadoAnterior;
          pintar(container);
          ui.toast(err.message, 'error');
        }
      });

      const addBtn = container.querySelector(`[data-add="${col.estado}"]`);
      if (addBtn) {
        addBtn.addEventListener('click', () => abrirFormularioNuevo(container, col.estado));
      }
    });

    if (puedeEditar) {
      container.querySelectorAll('.kanban-card').forEach((card) => {
        card.setAttribute('draggable', 'true');
        card.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', card.dataset.id);
          card.classList.add('dragging');
        });
        card.addEventListener('dragend', () => card.classList.remove('dragging'));
      });
    }
  }

  function columnaHtml(col) {
    const tareas = tareasActuales.filter((t) => t.estado === col.estado);
    return `
      <div class="kanban-col" data-col="${col.estado}">
        <div class="kanban-col__head">
          <h4>${col.titulo}</h4>
          <span class="kanban-col__count">${tareas.length}</span>
        </div>
        ${tareas.map(tarjetaHtml).join('')}
        ${puedeEditar ? `<button class="kanban-add" data-add="${col.estado}">+ Nueva tarea</button>` : ''}
      </div>`;
  }

  function tarjetaHtml(t) {
    return `
      <div class="kanban-card" data-id="${t._id}">
        <div class="kanban-card__top">
          ${t.codigo ? `<code>${escapeHtml(t.codigo)}</code>` : '<span></span>'}
        </div>
        <p>${escapeHtml(t.titulo)}</p>
        <div class="kanban-card__meta">
          <span class="kanban-card__resp">${escapeHtml(t.responsable_nombre || 'Sin asignar')}</span>
          <span class="priority-dot ${t.prioridad}" title="Prioridad ${t.prioridad}"></span>
        </div>
      </div>`;
  }

  function abrirFormularioNuevo(container, estado) {
    const titulo = prompt('Título de la nueva tarea:');
    if (!titulo || !titulo.trim()) return;

    api.tasks
      .create({ id_sprint: sprintIdActual, titulo: titulo.trim(), estado, prioridad: 'media' })
      .then((tarea) => {
        tareasActuales.push(tarea);
        pintar(container);
        ui.toast('Tarea creada.');
      })
      .catch((err) => ui.toast(err.message, 'error'));
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  window.NexusApp.panels.scrum = { render };
})();
