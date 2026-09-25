import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  {
    path: 'registrar',
    loadComponent: () =>
      import('./pages/registrar/Registrar.component').then((m) => m.RegistrarComponent),
  },
  {
    path: 'marketplace',
    loadComponent: () =>
      import('./pages/marketplace/marketplace.component').then((m) => m.MarketplaceComponent),
    canActivate: [authGuard],
  },
];
