/**
 * Panel: Portal del cliente
 * GET /api/projects · GET /api/projects/:id/status
 * GET /api/documents · POST /api/documents/upload · GET /api/documents/download/:id
 */
(function () {
  'use strict';
  window.NexusApp = window.NexusApp || {};
  window.NexusApp.panels = window.NexusApp.panels || {};

  const { api, ui } = window.NexusApp;

  let proyectoActualId = null;

  async function render(container) {
    container.innerHTML = '<div class="state-msg"><div class="spinner"></div>Cargando tu expediente…</div>';

    try {
      const proyectos = await api.projects.list();

      if (!proyectos.length) {
        container.innerHTML = `<div class="state-msg">${ui.iconInfo()}Todavía no tienes proyectos asociados. Cuando Consultores TAF inicie tu asesoría, aparecerá aquí.</div>`;
        return;
      }

      proyectoActualId = proyectos[0]._id;

      container.innerHTML = `
        ${
          proyectos.length > 1
            ? `<select class="project-select" id="projectSelect">
                 ${proyectos.map((p) => `<option value="${p._id}">${escapeHtml(p.nombre_proyecto)}</option>`).join('')}
               </select>`
            : ''
        }
        <div class="portal-grid">
          <div class="card card-pad" id="timelineBox"></div>
          <div class="card card-pad" id="docsBox"></div>
        </div>`;

      const select = container.querySelector('#projectSelect');
      if (select) {
        select.addEventListener('change', () => {
          proyectoActualId = select.value;
          cargarProyecto(container);
        });
      }

      await cargarProyecto(container);
    } catch (err) {
      container.innerHTML = `<div class="state-msg">${ui.iconWarning()}${escapeHtml(err.message)}</div>`;
    }
  }

  async function cargarProyecto(container) {
    const timelineBox = container.querySelector('#timelineBox');
    const docsBox = container.querySelector('#docsBox');
    timelineBox.innerHTML = '<div class="state-msg"><div class="spinner"></div></div>';
    docsBox.innerHTML = '<div class="state-msg"><div class="spinner"></div></div>';

    try {
      const [{ proyecto, hitos, avancePromedio }, documentos] = await Promise.all([
        api.projects.status(proyectoActualId),
        api.documents.list()
      ]);

      pintarTimeline(timelineBox, proyecto, hitos, avancePromedio);
      pintarDocumentos(docsBox, documentos);
    } catch (err) {
      timelineBox.innerHTML = `<div class="state-msg">${ui.iconWarning()}${escapeHtml(err.message)}</div>`;
    }
  }

  function pintarTimeline(box, proyecto, hitos, avancePromedio) {
    box.innerHTML = `
      <h4 style="font-family:var(--font-display); font-size:17px; margin-bottom:4px;">${escapeHtml(proyecto.nombre_proyecto)}</h4>
      <p style="font-size:12.8px; color:var(--text-muted); margin-bottom:6px;">${escapeHtml(proyecto.descripcion || '')}</p>
      <div class="progress-bar"><div class="progress-bar__fill" style="width:${avancePromedio}%;"></div></div>
      <p style="font-family:var(--font-mono); font-size:11.5px; color:var(--text-soft); margin-bottom:6px;">${avancePromedio}% de avance general</p>
      <div style="margin-top:12px;">
        ${hitos
          .map(
            (h) => `
          <div class="milestone">
            <div class="milestone__dot ${h.estado}"></div>
            <div>
              <h5>${escapeHtml(h.nombre_hito)}</h5>
              ${h.descripcion ? `<p>${escapeHtml(h.descripcion)}</p>` : ''}
              <div class="milestone__pct">${h.porcentaje_avance}% completado</div>
            </div>
          </div>`
          )
          .join('')}
      </div>`;
  }

  function pintarDocumentos(box, documentos) {
    box.innerHTML = `
      <h4 style="font-family:var(--font-display); font-size:17px; margin-bottom:14px;">Documentos</h4>
      <div id="docsList">
        ${
          documentos.length
            ? documentos.map(documentoHtml).join('')
            : '<p style="font-size:13px; color:var(--text-soft);">Aún no hay documentos cargados.</p>'
        }
      </div>
      <div class="upload-drop" id="uploadDrop">
        ${ui.iconUpload()}
        <p>Arrastra un archivo aquí o haz clic para elegirlo</p>
        <span>PDF, PNG o JPG · máx. 10&nbsp;MB</span>
        <input type="file" id="fileInput" accept=".pdf,.png,.jpg,.jpeg" style="display:none;">
      </div>`;

    box.querySelectorAll('.doc-download').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api.documents.download(btn.dataset.id, btn.dataset.name);
        } catch (err) {
          ui.toast(err.message, 'error');
        }
      });
    });

    const dropzone = box.querySelector('#uploadDrop');
    const fileInput = box.querySelector('#fileInput');

    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) subirArchivo(fileInput.files[0], box);
    });
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files[0]) subirArchivo(e.dataTransfer.files[0], box);
    });
  }

  function documentoHtml(d) {
    const tamanoKb = Math.round(d.tamano / 1024);
    return `
      <div class="doc-row">
        <div class="doc-row__name">${ui.iconFile()}<span>${escapeHtml(d.nombre_original)}</span></div>
        <span class="doc-row__meta">${tamanoKb}&nbsp;KB</span>
        <button class="doc-download" data-id="${d._id}" data-name="${escapeHtml(d.nombre_original)}" title="Descargar">${ui.iconDownload()}</button>
      </div>`;
  }

  async function subirArchivo(file, box) {
    const formData = new FormData();
    formData.append('archivo', file);
    formData.append('id_proyecto', proyectoActualId);

    ui.toast('Subiendo documento…');
    try {
      await api.documents.upload(formData);
      ui.toast('Documento cargado correctamente.');
      const documentos = await api.documents.list();
      pintarDocumentos(box, documentos);
    } catch (err) {
      ui.toast(err.message, 'error');
    }
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  window.NexusApp.panels.portal = { render };
})();
