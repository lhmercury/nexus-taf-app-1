/**
 * Panel: Dashboard BI (Administrador / Directivo)
 * GET /api/bi/reports?desde=&hasta=
 * Los gráficos se dibujan a mano con SVG a partir de los datos reales
 * devueltos por la API — sin depender de ninguna librería externa.
 */
(function () {
  'use strict';
  window.NexusApp = window.NexusApp || {};
  window.NexusApp.panels = window.NexusApp.panels || {};

  const { api, ui } = window.NexusApp;

  async function render(container) {
    container.innerHTML = `
      <div class="filter-row">
        <label>Desde</label>
        <input type="date" id="biDesde">
        <label>Hasta</label>
        <input type="date" id="biHasta">
        <button class="btn btn-ghost btn-sm" id="biFiltrar">Filtrar</button>
      </div>
      <div id="biBody"><div class="state-msg"><div class="spinner"></div>Calculando indicadores…</div></div>`;

    container.querySelector('#biFiltrar').addEventListener('click', () => cargar(container));
    await cargar(container);
  }

  async function cargar(container) {
    const body = container.querySelector('#biBody');
    const desde = container.querySelector('#biDesde').value;
    const hasta = container.querySelector('#biHasta').value;

    body.innerHTML = '<div class="state-msg"><div class="spinner"></div></div>';

    try {
      const data = await api.bi.reports({ ...(desde && { desde }), ...(hasta && { hasta }) });
      pintar(body, data);
    } catch (err) {
      body.innerHTML = `<div class="state-msg">${ui.iconWarning()}${err.message}</div>`;
    }
  }

  function pintar(body, data) {
    const { balancePorArea, totales, burndown } = data;
    const balanceNeto = totales.ingresos - totales.gastos;

    body.innerHTML = `
      <div class="kpi-row">
        <div class="kpi-card income"><span>Ingresos totales</span><b>${formatoUsd(totales.ingresos)}</b></div>
        <div class="kpi-card expense"><span>Gastos totales</span><b>${formatoUsd(totales.gastos)}</b></div>
        <div class="kpi-card"><span>Balance neto</span><b style="color:${balanceNeto >= 0 ? 'var(--nosql)' : 'var(--danger)'}">${formatoUsd(balanceNeto)}</b></div>
      </div>
      <div class="bi-grid">
        <div class="card card-pad bi-chart-card">
          <h4>Balance por área (PostgreSQL)</h4>
          ${graficoBarras(balancePorArea)}
          <div class="legend">
            <span><i style="background:var(--nosql-bright)"></i>Ingresos</span>
            <span><i style="background:var(--danger)"></i>Gastos</span>
          </div>
        </div>
        <div class="card card-pad bi-chart-card">
          <h4>Burndown ${burndown.sprint ? '· ' + escapeHtml(burndown.sprint.nombre) : ''} (MongoDB)</h4>
          ${graficoBurndown(burndown)}
        </div>
      </div>`;
  }

  function graficoBarras(areas) {
    if (!areas.length) return '<p style="font-size:13px;color:var(--text-soft);">Sin movimientos registrados.</p>';

    const max = Math.max(1, ...areas.flatMap((a) => [a.ingresos, a.gastos]));
    const w = 460;
    const h = 190;
    const padBottom = 26;
    const groupW = w / areas.length;
    const barW = Math.min(30, groupW / 3.4);

    const barras = areas
      .map((a, i) => {
        const cx = i * groupW + groupW / 2;
        const hIngreso = (a.ingresos / max) * (h - padBottom);
        const hGasto = (a.gastos / max) * (h - padBottom);
        return `
        <g>
          <rect x="${cx - barW - 3}" y="${h - padBottom - hIngreso}" width="${barW}" height="${hIngreso}" rx="3" fill="var(--nosql-bright)"/>
          <rect x="${cx + 3}" y="${h - padBottom - hGasto}" width="${barW}" height="${hGasto}" rx="3" fill="var(--danger)"/>
          <text x="${cx}" y="${h - 6}" text-anchor="middle" font-family="IBM Plex Mono, monospace" font-size="10" fill="var(--text-soft)">${escapeHtml(a.area)}</text>
        </g>`;
      })
      .join('');

    return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" style="overflow:visible;">${barras}</svg>`;
  }

  function graficoBurndown(burndown) {
    const puntos = burndown.puntos || [];
    if (!puntos.length) return '<p style="font-size:13px;color:var(--text-soft);">No hay un sprint activo con tareas.</p>';

    const w = 460;
    const h = 190;
    const padBottom = 24;
    const padLeft = 26;
    const max = Math.max(1, ...puntos.map((p) => p.restante));

    const coordX = (dia) => padLeft + (dia / (puntos.length - 1 || 1)) * (w - padLeft - 10);
    const coordY = (restante) => (h - padBottom) - (restante / max) * (h - padBottom - 12);

    const observados = puntos.filter((p) => !p.proyectado);
    const proyectados = puntos.filter((p) => p.proyectado);
    // incluye el último punto observado como inicio de la línea proyectada, para que no quede un salto visual
    const proyectadosConEnlace = observados.length ? [observados[observados.length - 1], ...proyectados] : proyectados;

    const lineaObs = observados.map((p) => `${coordX(p.dia)},${coordY(p.restante)}`).join(' ');
    const lineaProy = proyectadosConEnlace.map((p) => `${coordX(p.dia)},${coordY(p.restante)}`).join(' ');

    const puntosSvg = observados
      .map((p) => `<circle cx="${coordX(p.dia)}" cy="${coordY(p.restante)}" r="2.6" fill="var(--sql-bright)"/>`)
      .join('');

    return `
      <svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">
        <line x1="${padLeft}" y1="${h - padBottom}" x2="${w}" y2="${h - padBottom}" stroke="var(--line)" stroke-width="1"/>
        <text x="0" y="${coordY(max) + 4}" font-family="IBM Plex Mono, monospace" font-size="9" fill="var(--text-soft)">${max}</text>
        <text x="0" y="${h - padBottom + 4}" font-family="IBM Plex Mono, monospace" font-size="9" fill="var(--text-soft)">0</text>
        ${lineaProy ? `<polyline points="${lineaProy}" fill="none" stroke="var(--text-soft)" stroke-width="1.6" stroke-dasharray="3 4"/>` : ''}
        <polyline points="${lineaObs}" fill="none" stroke="var(--sql-bright)" stroke-width="2.2"/>
        ${puntosSvg}
      </svg>
      <p style="font-family:var(--font-mono); font-size:11px; color:var(--text-soft); margin-top:6px;">
        ${burndown.pendientes ?? 0} de ${burndown.totalTareas ?? 0} tareas pendientes · línea punteada = proyección ideal
      </p>`;
  }

  function formatoUsd(valor) {
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(valor || 0);
  }

  function escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  window.NexusApp.panels.bi = { render };
})();
