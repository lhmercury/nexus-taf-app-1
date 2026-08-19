/**
 * NEXUS-TAF · Helpers de interfaz compartidos (toast + iconos inline).
 * Se carga ANTES que los paneles a propósito: varios paneles usan
 * `window.NexusApp.ui` desde el momento en que se cargan, así que este
 * archivo tiene que existir primero en el orden de <script> de app.html.
 */
(function () {
  'use strict';
  window.NexusApp = window.NexusApp || {};

  function svgCheck() { return '<path d="M4 12l5 5L20 6"/>'; }
  function svgAlert() { return '<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v4"/><path d="M12 17h.01"/>'; }
  function svgInfo() { return '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M12 11v5"/>'; }
  function svgUpload() { return '<path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>'; }
  function svgFile() { return '<path d="M6 3h8l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/>'; }
  function svgDownload() { return '<path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/>'; }

  const ui = {
    toast(mensaje, tipo = 'ok') {
      const el = document.getElementById('toast');
      el.querySelector('span').textContent = mensaje;
      el.className = 'toast show' + (tipo === 'error' ? ' error' : '');
      el.querySelector('.toast-icon').innerHTML = tipo === 'error' ? svgAlert() : svgCheck();
      clearTimeout(ui._timer);
      ui._timer = setTimeout(() => el.classList.remove('show'), 3800);
    },
    iconWarning: () => `<svg class="icon" style="width:26px;height:26px;">${svgAlert()}</svg>`,
    iconInfo: () => `<svg class="icon" style="width:26px;height:26px;">${svgInfo()}</svg>`,
    iconUpload: () => `<svg class="icon" style="width:26px;height:26px;">${svgUpload()}</svg>`,
    iconFile: () => `<svg class="icon" style="width:17px;height:17px;">${svgFile()}</svg>`,
    iconDownload: () => `<svg class="icon" style="width:16px;height:16px;">${svgDownload()}</svg>`
  };

  window.NexusApp.ui = ui;
})();
