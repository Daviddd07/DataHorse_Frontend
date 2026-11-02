import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './Services/auth.service';

// Va después de authGuard: si hay sesión pero no es administrador, lo manda al marketplace.
// El backend igual responde 403, esto solo evita mostrar una pantalla vacía.
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.me().pipe(
    map((usuario) => {
      if (usuario.es_admin) return true;
      void router.navigate(['/marketplace']);
      return false;
    }),
    catchError(() => {
      void router.navigate(['/login']);
      return of(false);
    }),
  );
};
