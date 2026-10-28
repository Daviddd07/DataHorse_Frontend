# ==========================================
# ETAPA 1: Compilar Angular
# ==========================================
FROM node:22-alpine AS build

WORKDIR /app

# Copiamos solo los archivos de dependencias para aprovechar la caché
COPY package.json package-lock.json ./

# Instalamos dependencias
RUN npm ci

# Copiamos el resto del código
COPY . .

# Compilamos Angular para producción
# (Ojo: si tu proyecto en angular.json se llama distinto a 'frontend', cambia la ruta de abajo)
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

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]