# ==========================================
# ETAPA 1: Compilar Angular
# ==========================================
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Compilamos para producción
RUN npm run build --configuration production

# ==========================================
# ETAPA 2: Servir con Nginx
# ==========================================
FROM nginx:alpine
# Copiamos lo compilado a Nginx
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]