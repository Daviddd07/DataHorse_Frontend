# ==========================================
# ETAPA 1: Compilar Angular
# ==========================================
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build -- --configuration production

# ==========================================
# ETAPA 2: Servir con Nginx
# ==========================================
FROM nginx:alpine

# Borramos la configuración por defecto de Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiamos nuestra configuración personalizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiamos los archivos compilados de Angular
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

# ✅ SOLUCIÓN SONARQUBE: Otorgar permisos al usuario nginx y cambiar a ese usuario
RUN chown -R nginx:nginx /var/cache/nginx /var/log/nginx /usr/share/nginx/html \
    && sed -i 's#/run/nginx.pid#/tmp/nginx.pid#' /etc/nginx/nginx.conf
USER nginx

# ✅ EXPONEMOS EL PUERTO 8080 (No el 80)
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]