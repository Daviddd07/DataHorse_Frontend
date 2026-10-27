// Detecta si estás en la PC (localhost) o en la IP (celular)
const host = window.location.hostname;

export const environment = {
  production: false,

  // Esto se adaptará solo:
  // En PC será: http://localhost:8000
  // En Celular será: http://192.168.X.X:8000
  apiUrl: `http://${host}:8000`,

  uploadsUrl: `http://${host}:8000`,

  googleClientId: '942711166900-mj0cag572gl4fdhh22b5u51qju6bc80t.apps.googleusercontent.com',
};
