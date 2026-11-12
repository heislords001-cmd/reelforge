# Render (and any container host). FFmpeg and a TTF font are required for video rendering.
FROM node:22-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

ENV NODE_ENV=production \
    SERVE_UI=true \
    RENDER_ENABLED=true \
    FFMPEG_PATH=/usr/bin/ffmpeg \
    FFPROBE_PATH=/usr/bin/ffprobe \
    WATERMARK_FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf

EXPOSE 4000
CMD ["npm", "start"]
