import { Injectable, OnDestroy, inject } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { environment } from '../../environments/environment';

export type NivelLog = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  nivel: NivelLog;

  mensaje: string;

  contexto: Record<string, unknown> | null;

  url: string;

  user_agent: string;

  sesion_id: string;

  fecha: string;
}

export interface LogLote {
  logs: LogEntry[];
}

const PRIORIDAD: Record<NivelLog, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Límites para no saturar al backend
const MAX_MENSAJE = 1000;
const MAX_CONTEXTO = 4000;
const TAMANO_LOTE = 10;
const ESPERA_ENVIO_MS = 5000;

export const LOGS_ENDPOINT = '/api/v1/logs';

@Injectable({
  providedIn: 'root',
})
export class LogService implements OnDestroy {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}${LOGS_ENDPOINT}`;

  private readonly nivelMinimo = PRIORIDAD[environment.logLevel as NivelLog] ?? PRIORIDAD.info;

  // Identifica todos los logs de una misma pestaña
  // (crypto.randomUUID no existe en http://IP, por eso se genera a mano)
  readonly sesionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  private cola: LogEntry[] = [];

  private temporizador: ReturnType<typeof setTimeout> | null = null;

  private readonly alOcultar = (): void => {
    if (document.visibilityState === 'hidden') {
      this.enviarAlSalir();
    }
  };

  constructor() {
    document.addEventListener('visibilitychange', this.alOcultar);
    window.addEventListener('pagehide', this.alOcultar);
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.alOcultar);
    window.removeEventListener('pagehide', this.alOcultar);
    this.flush();
  }

  // =====================================================
  // API PÚBLICA
  // =====================================================

  debug(mensaje: string, contexto?: Record<string, unknown>): void {
    this.registrar('debug', mensaje, contexto);
  }

  info(mensaje: string, contexto?: Record<string, unknown>): void {
    this.registrar('info', mensaje, contexto);
  }

  warn(mensaje: string, contexto?: Record<string, unknown>): void {
    this.registrar('warn', mensaje, contexto);
  }

  error(mensaje: string, contexto?: Record<string, unknown>): void {
    this.registrar('error', mensaje, contexto);
  }

  // =====================================================
  // ENVÍO AL BACKEND
  //
  // POST /api/v1/logs
  // =====================================================

  flush(): void {
    this.cancelarTemporizador();

    if (this.cola.length === 0) {
      return;
    }

    const lote: LogLote = { logs: this.cola };

    this.cola = [];

    this.http.post(this.apiUrl, lote, { withCredentials: true }).subscribe({
      error: () => {
        // Si el backend falla, descartamos el lote para no entrar en bucle
        if (!environment.production) {
          console.warn('No se pudieron enviar los logs al backend.');
        }
      },
    });
  }

  // =====================================================
  // INTERNOS
  // =====================================================

  private registrar(nivel: NivelLog, mensaje: string, contexto?: Record<string, unknown>): void {
    if (PRIORIDAD[nivel] < this.nivelMinimo) {
      return;
    }

    const entrada: LogEntry = {
      nivel,
      mensaje: String(mensaje).slice(0, MAX_MENSAJE),
      contexto: this.limpiarContexto(contexto),
      url: location.pathname,
      user_agent: navigator.userAgent,
      sesion_id: this.sesionId,
      fecha: new Date().toISOString(),
    };

    if (!environment.production) {
      const metodo = nivel === 'debug' ? 'log' : nivel;
      console[metodo](`[${nivel.toUpperCase()}] ${entrada.mensaje}`, entrada.contexto ?? '');
    }

    this.cola.push(entrada);

    if (nivel === 'error' || this.cola.length >= TAMANO_LOTE) {
      this.flush();
      return;
    }

    this.programarEnvio();
  }

  private limpiarContexto(contexto?: Record<string, unknown>): Record<string, unknown> | null {
    if (!contexto) {
      return null;
    }

    try {
      const json = JSON.stringify(contexto);

      if (json.length > MAX_CONTEXTO) {
        return { truncado: true, resumen: json.slice(0, MAX_CONTEXTO) };
      }

      return JSON.parse(json);
    } catch {
      return { error: 'Contexto no serializable' };
    }
  }

  private programarEnvio(): void {
    if (this.temporizador) {
      return;
    }

    this.temporizador = setTimeout(() => {
      this.temporizador = null;
      this.flush();
    }, ESPERA_ENVIO_MS);
  }

  private cancelarTemporizador(): void {
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
  }

  // Al cerrar o cambiar de pestaña, HttpClient puede cancelarse:
  // usamos fetch con keepalive para que la petición sobreviva.
  private enviarAlSalir(): void {
    this.cancelarTemporizador();

    if (this.cola.length === 0) {
      return;
    }

    const lote: LogLote = { logs: this.cola };

    this.cola = [];

    fetch(this.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lote),
      credentials: 'include',
      keepalive: true,
    }).catch(() => undefined);
  }
}
