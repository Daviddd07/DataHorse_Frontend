import { ErrorHandler, Injectable, inject } from '@angular/core';

import { HttpErrorResponse } from '@angular/common/http';

import { LogService } from './Services/log.service';

// Captura cualquier error no controlado de la aplicación
// (incluye window.onerror y promesas rechazadas, gracias a
// provideBrowserGlobalErrorListeners) y lo envía al backend.
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly log = inject(LogService);

  handleError(error: unknown): void {
    console.error(error);

    // Los errores HTTP ya los registra el interceptor
    if (error instanceof HttpErrorResponse) {
      return;
    }

    const err = error instanceof Error ? error : new Error(String(error));

    this.log.error(err.message || 'Error desconocido', {
      tipo: err.name,
      stack: err.stack ?? null,
    });
  }
}
