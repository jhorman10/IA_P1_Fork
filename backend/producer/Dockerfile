# ⚕️ HUMAN CHECK - Dockerfile del Producer
# Asegurarse de usar una versión LTS de Node.js

# --- Stage: development ---
# ⚕️ HUMAN CHECK - Stage de desarrollo para uso con docker-compose (hot-reload)
FROM node:20-slim AS development

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "start:dev"]

# --- Stage: build ---
FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# --- Stage: production ---
FROM node:20-slim AS production

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --chown=node:node --from=build /app/dist ./dist

# ⚕️ HUMAN CHECK - Puerto expuesto
# Verificar que coincida con la variable de entorno PRODUCER_PORT
EXPOSE 3000

# 🛡️ HUMAN CHECK - Security: Run as non-root user (H-16)
USER node

CMD ["node", "--enable-source-maps", "dist/main.js"]
