const pg = require('../models/postgres');
const { Sprint, Tarea } = require('../models/mongo');

/**
 * GET /api/bi/reports?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 * Consolida PostgreSQL (finanzas por área) y MongoDB (burndown del sprint
 * activo) en un único payload para el Dashboard Directivo — el mismo
 * cruce de motores que describe el Modelo Entidad-Conexión del proyecto.
 */
async function reportes(req, res) {
  const { desde, hasta } = req.query;

  const [movimientos, areas] = await Promise.all([pg.listarFinanzas({ desde, hasta }), pg.listarAreas()]);

  const balancePorArea = areas.map((area) => {
    const deArea = movimientos.filter((m) => m.id_area === area.id_area);
    const ingresos = deArea.filter((m) => m.tipo_movimiento === 'ingreso').reduce((s, m) => s + Number(m.monto), 0);
    const gastos = deArea.filter((m) => m.tipo_movimiento === 'gasto').reduce((s, m) => s + Number(m.monto), 0);
    return { area: area.nombre_area, estatus: area.estatus, ingresos, gastos, balance: ingresos - gastos };
  });

  const totales = balancePorArea.reduce(
    (acc, a) => ({ ingresos: acc.ingresos + a.ingresos, gastos: acc.gastos + a.gastos }),
    { ingresos: 0, gastos: 0 }
  );

  const burndown = await calcularBurndown();

  return res.json({ balancePorArea, totales, burndown });
}

/**
 * Burndown simplificado del sprint activo más reciente: interpola los
 * puntos restantes entre el total de tareas al inicio del sprint y las
 * tareas que siguen sin terminar hoy. Para un burndown histórico exacto
 * bastaría con snapshotear `pendientes` una vez al día (cron) en una
 * colección aparte — este cálculo cubre el caso de uso del dashboard
 * sin necesitar esa infraestructura adicional todavía.
 */
async function calcularBurndown() {
  const sprint = await Sprint.findOne({ estado: 'activo' }).sort({ fecha_inicio: -1 }).lean();
  if (!sprint) return { sprint: null, puntos: [] };

  const tareas = await Tarea.find({ id_sprint: sprint._id }).lean();
  const total = tareas.length;
  const pendientes = tareas.filter((t) => t.estado !== 'hecho').length;

  const inicio = new Date(sprint.fecha_inicio);
  const fin = new Date(sprint.fecha_fin);
  const hoy = new Date();
  const diasTotales = Math.max(1, Math.round((fin - inicio) / 86400000));
  const diasTranscurridos = Math.min(diasTotales, Math.max(0, Math.round((hoy - inicio) / 86400000)));

  const puntos = [];
  for (let dia = 0; dia <= diasTotales; dia++) {
    if (dia <= diasTranscurridos) {
      // Descenso lineal observado entre el total inicial y los pendientes actuales.
      const avance = diasTranscurridos === 0 ? 0 : dia / diasTranscurridos;
      const valor = Math.round(total - avance * (total - pendientes));
      puntos.push({ dia, restante: valor, proyectado: false });
    } else {
      // Proyección ideal a partir de hoy, asumiendo ritmo constante hasta cero.
      const restantesIdeal = Math.max(
        0,
        Math.round(pendientes - ((dia - diasTranscurridos) / (diasTotales - diasTranscurridos || 1)) * pendientes)
      );
      puntos.push({ dia, restante: restantesIdeal, proyectado: true });
    }
  }

  return {
    sprint: { id: sprint._id, nombre: sprint.nombre_sprint, fecha_inicio: sprint.fecha_inicio, fecha_fin: sprint.fecha_fin },
    totalTareas: total,
    pendientes,
    puntos
  };
}

module.exports = { reportes };
