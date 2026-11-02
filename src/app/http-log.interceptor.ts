import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';

import { inject } from '@angular/core';

import { tap } from 'rxjs';

import { LOGS_ENDPOINT, LogService } from './Services/log.service';

// Registra las peticiones HTTP que fallan.
// 401 se ignora porque es la respuesta normal cuando no hay sesión.
export const httpLogInterceptor: HttpInterceptorFn = (req, next) => {
  // Nunca registrar el propio envío de logs (evita bucles)
  if (req.url.includes(LOGS_ENDPOINT)) {
    return next(req);
  }

  const log = inject(LogService);
  const inicio = Date.now();

  return next(req).pipe(
    tap({
      error: (e: unknown) => {
        if (!(e instanceof HttpErrorResponse) || e.status === 401) {
          return;
        }

        const contexto = {
          metodo: req.method,
          endpoint: req.url,
          status: e.status,
          detalle: e.error?.detail ?? null,
          duracion_ms: Date.now() - inicio,
        };

        const mensaje = `HTTP ${e.status} en ${req.method} ${req.url}`;

        if (e.status === 0 || e.status >= 500) {
          log.error(mensaje, contexto);
        } else {
          log.warn(mensaje, contexto);
        }
      },
    }),
  );
};
