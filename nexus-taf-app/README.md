# NEXUS-TAF · Aplicación

Ecosistema digital de **Sociedad Civil Consultores TAF**. Backend real en
Node.js/Express con arquitectura híbrida **PostgreSQL + MongoDB**, autenticación
**JWT + MFA (TOTP)**, y un frontend sin build-step que implementa los 5 paneles
interactivos de la plataforma:

| Panel | Ruta interna | Motor principal |
|---|---|---|
| Autenticación MFA | pantallas de login / verificación | PostgreSQL |
| Administración de roles | `#roles` (solo Administrador) | PostgreSQL |
| Tablero Scrum | `#scrum` (Administrador / Consultor / Directivo) | MongoDB |
| Portal del cliente | `#portal` (todos los roles) | MongoDB |
| Dashboard BI | `#bi` (Administrador / Directivo) | PostgreSQL + MongoDB |

```
nexus-taf-app/
├── docker-compose.yml       ← levanta todo con un comando
├── backend/                 ← API REST (Node.js + Express)
│   ├── src/
│   │   ├── config/          conexión a Postgres y Mongo
│   │   ├── db/               migración SQL + seed de datos demo
│   │   ├── middleware/       auth JWT, roles, subida de archivos, errores
│   │   ├── models/           Postgres (queries) + Mongo (schemas)
│   │   ├── controllers/      lógica de cada endpoint
│   │   └── routes/           definición de rutas REST
│   └── Dockerfile
└── frontend/                 ← sitio + aplicación (HTML/CSS/JS, sin build)
    ├── index.html             sitio institucional (el que ya conocías)
    ├── app.html                ← la aplicación de los 5 paneles
    ├── css/app.css
    └── js/                     api.js · ui.js · main.js · panels/*.js
```

---

## 1 · Correrlo en local (con Docker — recomendado)

Requiere [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado.

```bash
cd nexus-taf-app
cp backend/.env.example backend/.env
# abre backend/.env y cambia JWT_SECRET por un valor propio, por ejemplo:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

docker compose up -d --build
docker compose exec backend npm run setup   # crea las tablas y siembra datos demo
```

Ábrelo:
- **Sitio + aplicación:** http://localhost:8080 (botón "Entrar a la plataforma", o directo en `/app.html`)
- **API:** http://localhost:4000/api/health

Para ver logs o apagarlo:
```bash
docker compose logs -f backend
docker compose down          # apaga todo (los datos persisten en volúmenes)
docker compose down -v       # apaga y BORRA también los datos
```

---

## 2 · Correrlo en local (sin Docker)

Necesitas Node.js ≥18, una instancia de PostgreSQL y una de MongoDB accesibles
(pueden ser locales o gratuitas en la nube — ver sección 4).

```bash
cd backend
cp .env.example .env
# edita .env: POSTGRES_URL, MONGO_URL y JWT_SECRET

npm install
npm run setup      # migra PostgreSQL + siembra datos demo en ambas bases
npm run dev         # API en http://localhost:4000
```

En otra terminal, sirve el frontend con cualquier servidor estático
(no lo abras con doble clic — `fetch()` y las descargas necesitan http, no `file://`):

```bash
cd frontend
npx serve . -l 5173
# abre http://localhost:5173
```

Si usas un puerto distinto a 5173, agrégalo a `CORS_ORIGIN` en `backend/.env`.

---

## 3 · Cuentas de demostración

El seed crea un usuario por cada rol, **todos con MFA activo desde el primer login**:

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@consultorestaf.com` | `Admin123!` |
| Directivo | `directivo@consultorestaf.com` | `Directivo123!` |
| Consultor | `consultor@consultorestaf.com` | `Consultor123!` |
| Cliente | `cliente@empresa-xyz.com` | `Cliente123!` |

En la pantalla de login puedes hacer clic sobre cualquiera de estas cuentas
para autocompletarla. Tras la contraseña, la app pedirá un código de 6 dígitos.

**¿No tienes una app autenticadora a mano?** En la pantalla de verificación hay
un botón **"Rellenar código de prueba"** que llama a
`GET /api/auth/dev/totp/:email` y autocompleta el código vigente. Ese endpoint
se autodesactiva solo cuando `NODE_ENV=production` (revisa
`backend/src/controllers/auth.controller.js#devTotp`) — no requiere que hagas
nada manualmente, pero confírmalo antes de ir a producción.

Para usar una app autenticadora real (Google Authenticator, Authy, etc.),
registra un usuario nuevo desde `POST /api/auth/register`: la respuesta trae
un `qrDataUrl` (imagen base64) listo para escanear.

---

## 4 · Desplegar en la nube

La arquitectura separa claramente tres piezas desplegables: **bases de datos
gestionadas**, **API** y **frontend estático**. No hace falta un servidor propio.

### 4.1 Bases de datos gestionadas (nivel gratuito disponible)
- **PostgreSQL:** [Neon](https://neon.tech), [Supabase](https://supabase.com) o Railway.
- **MongoDB:** [MongoDB Atlas](https://www.mongodb.com/atlas) (M0 gratuito).

Copia las cadenas de conexión que te den a `POSTGRES_URL` y `MONGO_URL`.

### 4.2 Backend (API)
Cualquier host que corra contenedores Docker o Node.js sirve: **Render**,
**Railway**, **Fly.io**, un droplet de DigitalOcean, etc.

1. Sube este repositorio a GitHub.
2. En el proveedor, crea un servicio apuntando a la carpeta `backend/`
   (o al `Dockerfile` incluido).
3. Variables de entorno a configurar (las mismas de `.env.example`):
   `NODE_ENV=production`, `POSTGRES_URL`, `MONGO_URL`, `JWT_SECRET`,
   `CORS_ORIGIN` (la URL pública de tu frontend), `UPLOAD_DIR`.
4. Corre una vez `npm run setup` (o `node src/db/migrate.js && node src/db/seed.js`)
   contra la base de datos de producción, para crear el esquema y —si quieres—
   los usuarios demo.
5. Verifica `GET https://tu-api.com/api/health`.

> **Documentos cargados:** por defecto se guardan en disco
> (`backend/uploads`). La mayoría de los PaaS tienen sistema de archivos
> efímero, así que para producción real monta un volumen persistente o
> sustituye `backend/src/utils/storage.js` por un bucket S3 / DigitalOcean
> Spaces — la firma de las funciones ya está pensada para ese cambio sin
> tocar los controladores.

### 4.3 Frontend
Es HTML/CSS/JS estático — **Netlify**, **Vercel**, **GitHub Pages** o el mismo
bucket S3 sirven perfecto. Solo hay que:

1. Desplegar la carpeta `frontend/` completa.
2. Abrir `frontend/app.html` y cambiar una sola línea:
   ```js
   window.NEXUS_CONFIG = { apiBase: 'https://tu-api.com/api' };
   ```
3. Verificar que esa URL de frontend esté en `CORS_ORIGIN` del backend.

---

## 5 · Referencia de la API

Todas las rutas cuelgan de `/api`. Las protegidas requieren
`Authorization: Bearer <token>`.

| Método | Endpoint | Rol requerido |
|---|---|---|
| POST | `/auth/register` | público |
| POST | `/auth/login` | público |
| POST | `/auth/mfa` | token de pre-autenticación |
| GET | `/auth/me` | cualquier sesión válida |
| GET | `/users` | Administrador |
| PUT | `/users/:id/role` | Administrador |
| GET | `/tasks` | Administrador · Consultor · Directivo |
| POST | `/tasks` | Administrador · Consultor |
| PATCH | `/tasks/:id` | Administrador · Consultor |
| GET | `/projects/:id/status` | dueño del proyecto, o Admin/Directivo/Consultor |
| POST | `/documents/upload` | cualquier sesión válida |
| GET | `/documents/download/:id` | dueño del documento, o Admin/Directivo/Consultor |
| GET | `/bi/reports` | Administrador · Directivo |

---

## 6 · Notas de seguridad antes de producción

- Genera un `JWT_SECRET` largo y aleatorio; nunca reutilices el de `.env.example`.
- `helmet`, CORS con lista blanca y `bcryptjs` (12 rondas) ya están activos por defecto.
- Las cuentas se bloquean automáticamente tras `MAX_LOGIN_ATTEMPTS` (5 por defecto).
- Toda acción sensible (login, cambio de rol, carga/descarga de documentos)
  queda en la colección `auditorias` de MongoDB — es un log de solo inserción.
- Revisa que `GET /api/auth/dev/totp/:email` responda `404` en tu entorno de
  producción antes de anunciarlo (se desactiva solo con `NODE_ENV=production`,
  pero vale la pena confirmarlo).
