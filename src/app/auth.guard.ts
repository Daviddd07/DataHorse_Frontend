import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './Services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.me().pipe(
    map(() => true),
    catchError(() => {
      // Después de iniciar sesión vuelve a donde quería entrar
      void router.navigate(['/login'], { queryParams: { volver: state.url } });
      return of(false);
    }),
  );
};
