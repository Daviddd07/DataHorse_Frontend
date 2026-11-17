// Configuración para el SERVIDOR (AWS, detrás de Caddy). Se usa con:
//   ng build --configuration despliegue   (docker-compose.prod.yml lo hace solo)
// No lleva el dominio escrito: la API se deduce del dominio donde se abre la app
// (https://midominio.com → https://api.midominio.com), igual que en docker-compose.prod.yml / Caddyfile.
const dominio = window.location.hostname;

export const environment = {
  production: true,

  apiUrl: `https://api.${dominio}`,
  uploadsUrl: `https://api.${dominio}`,

  // WebSocket del chat y notificaciones (cifrado: wss)
  wsUrl: `wss://api.${dominio}`,

  // ID público del cliente OAuth de Google (no es un secreto: el navegador siempre lo ve).
  // En Google Cloud Console hay que agregar https://DOMINIO como "origen autorizado".
  googleClientId: '942711166900-mj0cag572gl4fdhh22b5u51qju6bc80t.apps.googleusercontent.com',

  // En producción solo se envían al backend avisos y errores
  logLevel: 'warn',
};
