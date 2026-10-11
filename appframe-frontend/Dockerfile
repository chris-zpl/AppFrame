# ==============================================================================
# Multi-stage Dockerfile for AppFrame Frontend (React + Vite + Nginx)
# ==============================================================================

# --- Stage 1: Build ---
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json vite.config.ts tailwind.config.ts postcss.config.js index.html ./
COPY public/ ./public/
COPY src/ ./src/

# Argumento para definir a URL da API durante o build
ARG VITE_API_BASE_URL=http://localhost:3000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

# --- Stage 2: Production Web Server ---
FROM nginx:alpine AS runner

# Remove a configuração padrão do Nginx
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copia nossa configuração otimizada para SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos compilados da etapa anterior
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
