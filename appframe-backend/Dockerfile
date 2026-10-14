# ==============================================================================
# Multi-stage Dockerfile for AppFrame Backend (NestJS + FFmpeg + BullMQ)
# ==============================================================================

# --- Stage 1: Build ---
FROM node:22-alpine AS builder

WORKDIR /app

# Instala dependências de build necessárias para compilação nativa se houver
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src/ ./src/

RUN npm run build

# Mantém apenas as dependências de produção
RUN npm prune --production

# --- Stage 2: Production Runner ---
FROM node:22-alpine AS runner

WORKDIR /app

# Instalação do FFmpeg, FFprobe, yt-dlp e fontes para legendas (incluindo suporte a emojis e caracteres especiais)
RUN apk add --no-cache \
    ffmpeg \
    yt-dlp \
    yt-dlp-ejs-rt-nodejs \
    fontconfig \
    ttf-dejavu \
    font-noto \
    font-noto-cjk \
    font-noto-extra \
    curl \
    ca-certificates \
  && mkdir -p /usr/share/fonts/google-fonts \
  && curl -sSL https://raw.githubusercontent.com/google/fonts/main/ofl/plusjakartasans/PlusJakartaSans%5Bwght%5D.ttf -o /usr/share/fonts/google-fonts/PlusJakartaSans.ttf \
  && curl -sSL https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf -o /usr/share/fonts/google-fonts/Montserrat.ttf \
  && curl -sSL https://raw.githubusercontent.com/google/fonts/main/ofl/anton/Anton-Regular.ttf -o /usr/share/fonts/google-fonts/Anton.ttf \
  && curl -sSL https://raw.githubusercontent.com/google/fonts/main/ofl/bebasneue/BebasNeue-Regular.ttf -o /usr/share/fonts/google-fonts/BebasNeue.ttf \
  && fc-cache -f

ENV NODE_ENV=production
ENV PORT=3000
ENV FFMPEG_PATH=ffmpeg
ENV FFPROBE_PATH=ffprobe
ENV YTDLP_PATH=yt-dlp
ENV TEMP_DIR=storage/temp
ENV FONTS_DIR=/usr/share/fonts

# Cria diretórios de armazenamento e temporários com permissões
RUN mkdir -p storage/temp storage/temp/previews storage/temp/downloads storage/watermarks storage/renders storage/final && chown -R node:node /app

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/package.json ./package.json

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/auth/me || exit 0

CMD ["node", "dist/main.js"]
