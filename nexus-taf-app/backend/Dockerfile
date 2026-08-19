# ============================================================
# NEXUS-TAF API — imagen de producción
# ============================================================
FROM node:20-alpine

WORKDIR /app

# Instala dependencias primero para aprovechar la caché de capas de Docker
COPY package*.json ./
RUN npm install --omit=dev

# Copia el resto del código fuente
COPY . .

# Carpeta de documentos cargados (se recomienda montar un volumen aquí)
RUN mkdir -p /app/uploads

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "src/server.js"]
