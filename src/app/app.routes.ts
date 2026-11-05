import { Routes } from '@angular/router';

import { Login } from './pages/login/login';

import { authGuard } from './auth.guard';

import { adminGuard } from './admin.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },

  {
    path: 'login',
    component: Login,
  },

  {
    path: 'registrar',

    loadComponent: () =>
      import('./pages/registrar/Registrar.component').then((m) => m.RegistrarComponent),
  },

  {
    path: 'verificar-correo',

    loadComponent: () =>
      import('./pages/verificar-correo/verificar-correo.component').then(
        (m) => m.VerificarCorreoComponent,
      ),
  },

  {
    path: 'recuperar-password',

    loadComponent: () =>
      import('./pages/recuperar-password/recuperar-password.component').then(
        (m) => m.RecuperarPasswordComponent,
      ),
  },

  {
    path: 'marketplace',

    loadComponent: () =>
      import('./pages/marketplace/marketplace.component').then((m) => m.MarketplaceComponent),

    canActivate: [authGuard],
  },

  {
    path: 'publicaciones/nueva',

    loadComponent: () =>
      import('./pages/marketplace/nueva-publicacion/nueva-publicacion.component').then(
        (m) => m.NuevaPublicacionComponent,
      ),

    canActivate: [authGuard],
  },

  {
    path: 'publicaciones/:id',

    loadComponent: () =>
      import('./pages/publicaciones/detalle-publicacion/detalle-publicacion.component').then(
        (m) => m.DetallePublicacionComponent,
      ),

    canActivate: [authGuard],
  },

  {
    path: 'mis-caballos',

    loadComponent: () =>
      import('./pages/mis-caballos/mis-caballos.component').then((m) => m.MisCaballosComponent),

    canActivate: [authGuard],
  },

  {
    path: 'mis-caballos/editar/:id',

    loadComponent: () =>
      import('./pages/editar-caballo/editar-caballo.component').then(
        (m) => m.EditarCaballoComponent,
      ),

    canActivate: [authGuard],
  },

  {
    path: 'conversaciones',

    loadComponent: () =>
      import('./pages/conversaciones/conversaciones.component').then(
        (m) => m.ConversacionesComponent,
      ),

    canActivate: [authGuard],
  },

  {
    path: 'conversaciones/:id',

    loadComponent: () =>
      import('./pages/conversaciones/conversaciones.component').then(
        (m) => m.ConversacionesComponent,
      ),

    canActivate: [authGuard],
  },

  {
    path: 'compatibilidad/mis-resultados',

    loadComponent: () =>
      import('./pages/mis-resultados/mis-resultados.component').then(
        (m) => m.MisResultadosComponent,
      ),

    canActivate: [authGuard],
  },

  // Va antes de :idCaballo/:idYegua para que "resultados" no se tome como id
  {
    path: 'compatibilidad/resultados/:idSolicitud',

    loadComponent: () =>
      import('./pages/compatibilidad-resultado/compatibilidad-resultado.component').then(
        (m) => m.CompatibilidadResultadoComponent,
      ),

    canActivate: [authGuard],
  },

  {
    path: 'compatibilidad/:idCaballo/:idYegua',

    loadComponent: () =>
      import('./pages/compatibilidad-resultado/compatibilidad-resultado.component').then(
        (m) => m.CompatibilidadResultadoComponent,
      ),

    canActivate: [authGuard],
  },

  {
    path: 'mi-cuenta',

    loadComponent: () =>
      import('./pages/mi-cuenta/mi-cuenta.component').then((m) => m.MiCuentaComponent),

    canActivate: [authGuard],
  },

  {
    path: 'admin',

    loadComponent: () =>
      import('./pages/admin/panel-admin/panel-admin.component').then((m) => m.PanelAdminComponent),

    canActivate: [authGuard, adminGuard],
  },

  {
    path: 'admin/elegir',

    loadComponent: () =>
      import('./pages/admin/elegir-panel/elegir-panel.component').then(
        (m) => m.ElegirPanelComponent,
      ),

    canActivate: [authGuard, adminGuard],
  },
];
