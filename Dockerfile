# Image de production : site Next.js + worker de tâches de fond dans le même conteneur.
# Les données (base SQLite, fichiers générés) vivent dans /data : montez-y un volume persistant.

FROM node:22-bookworm-slim AS build
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Les dépendances de développement restent : le worker tourne avec tsx et le démarrage avec concurrently.
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 DATA_DIR=/data PORT=3000 CHROMIUM=/usr/bin/chromium
# Chromium sert à la relecture visuelle des boutiques par l'IA (captures ordinateur et téléphone).
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates tini chromium fonts-liberation && rm -rf /var/lib/apt/lists/*
COPY --from=build /app /app
RUN mkdir -p /data && chown -R node:node /data /app
USER node
VOLUME ["/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["npm", "start"]
