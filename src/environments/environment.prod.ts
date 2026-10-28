export const environment = {
  production: true, // Lo dejamos en true porque Docker compila así

  // Cambiamos las URLs de producción por las de tu Docker local
  apiUrl: 'http://localhost:8000',
  uploadsUrl: 'http://localhost:8000',

  // Puedes dejar este mismo Client ID si configuras Google, o crear uno nuevo
  googleClientId: '942711166900-mj0cag572gl4fdhh22b5u51qju6bc80t.apps.googleusercontent.com',
};
