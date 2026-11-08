import { Injectable, OnDestroy, inject, signal } from '@angular/core';

import { Observable, Subject } from 'rxjs';

import { environment } from '../../environments/environment';

import { ConversacionService, EstadoConexion, MensajeChat } from './conversacion.service';

export interface AvisoMensaje {
  mensaje: MensajeChat;
  remitente: string;
  titulo_publicacion: string;
}

/** Un contacto (alguien con quien chateo) entró o salió de la app. */
export interface CambioPresencia extends EstadoConexion {
  id_usuario: number;
}

/** El otro participante finalizó una conversación conmigo. */
export interface ConversacionFinalizada {
  id_conversacion: number;
  por: string;
}

/* Sin sesión u origen rechazado: no tiene sentido reintentar hasta la próxima navegación */
const CIERRES_DEFINITIVOS = new Set([1008, 4401]);

const ESPERA_INICIAL_MS = 1000;
const ESPERA_MAXIMA_MS = 30000;

/**
 * Avisos de mensajes nuevos en cualquier pantalla (WebSocket /ws/notificaciones).
 * Lleva el contador de mensajes sin leer que muestran los menús y emite un aviso
 * por cada mensaje que llega a una conversación que el usuario no tiene abierta.
 */
@Injectable({
  providedIn: 'root',
})
export class NotificacionesService implements OnDestroy {
  private readonly conversaciones = inject(ConversacionService);

  readonly noLeidos = signal(0);

  private readonly avisosSubject = new Subject<AvisoMensaje>();

  /** Mensajes nuevos de conversaciones que no están abiertas en pantalla. */
  readonly avisos$: Observable<AvisoMensaje> = this.avisosSubject.asObservable();

  private readonly presenciaSubject = new Subject<CambioPresencia>();
  private readonly finalizadasSubject = new Subject<ConversacionFinalizada>();

  /** Contactos que pasan a "en línea" o a "inactivo". */
  readonly presencia$: Observable<CambioPresencia> = this.presenciaSubject.asObservable();
  /** Conversaciones que el otro participante finalizó (ya se le puede calificar). */
  readonly finalizadas$: Observable<ConversacionFinalizada> =
    this.finalizadasSubject.asObservable();

  private activo = false;
  private socket: WebSocket | null = null;
  private intentos = 0;
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private conversacionAbierta: number | null = null;

  /** Empieza a escuchar (no hace nada si ya está escuchando). */
  iniciar(): void {
    if (this.activo) {
      return;
    }
    this.activo = true;
    this.intentos = 0;
    this.refrescarConteo();
    this.abrir();
  }

  /** Deja de escuchar (al cerrar sesión o en las pantallas públicas). */
  detener(): void {
    this.activo = false;
    this.cancelarReintento();
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close(1000, 'Fin de la sesión');
      }
    }
    this.noLeidos.set(0);
  }

  refrescarConteo(): void {
    this.conversaciones.contarNoLeidos().subscribe({
      next: ({ total }) => this.noLeidos.set(total),
      error: () => undefined, // se conserva el último valor conocido
    });
  }

  /** El chat avisa qué conversación está viendo: de esa no se muestran avisos. */
  abrirConversacion(idConversacion: number): void {
    this.conversacionAbierta = idConversacion;
  }

  cerrarConversacion(): void {
    this.conversacionAbierta = null;
  }

  ngOnDestroy(): void {
    this.detener();
    this.avisosSubject.complete();
    this.presenciaSubject.complete();
    this.finalizadasSubject.complete();
  }

  /** Punto de extensión para las pruebas. */
  protected crearSocket(url: string): WebSocket {
    return new WebSocket(url);
  }

  private abrir(): void {
    const socket = this.crearSocket(`${environment.wsUrl}/ws/notificaciones`);
    this.socket = socket;

    socket.onopen = () => {
      // Tras una reconexión se recalcula por si llegaron mensajes mientras tanto
      if (this.intentos > 0) {
        this.refrescarConteo();
      }
      this.intentos = 0;
    };

    socket.onmessage = (evento: MessageEvent) => this.procesar(evento.data);

    socket.onclose = (evento: CloseEvent) => {
      if (this.socket !== socket) {
        return;
      }
      this.socket = null;
      if (CIERRES_DEFINITIVOS.has(evento.code)) {
        this.activo = false;
        return;
      }
      this.programarReintento();
    };

    socket.onerror = () => undefined; // siempre va seguido de onclose
  }

  private procesar(datos: unknown): void {
    let evento: Partial<AvisoMensaje> &
      Partial<CambioPresencia> &
      Partial<Omit<ConversacionFinalizada, 'por'>> & { tipo?: string; por?: string };
    try {
      evento = JSON.parse(String(datos));
    } catch {
      return;
    }
    if (evento.tipo === 'presencia' && typeof evento.id_usuario === 'number') {
      this.presenciaSubject.next({
        id_usuario: evento.id_usuario,
        en_linea: !!evento.en_linea,
        ultima_conexion: evento.ultima_conexion ?? null,
      });
      return;
    }
    if (evento.tipo === 'conversacion_finalizada' && typeof evento.id_conversacion === 'number') {
      this.finalizadasSubject.next({
        id_conversacion: evento.id_conversacion,
        por: evento.por ?? '',
      });
      return;
    }
    if (evento.tipo !== 'nuevo_mensaje' || !evento.mensaje) {
      return;
    }
    if (evento.mensaje.id_conversacion === this.conversacionAbierta) {
      return; // el chat abierto ya lo muestra y lo marca como leído
    }
    this.noLeidos.update((n) => n + 1);
    this.avisosSubject.next({
      mensaje: evento.mensaje,
      remitente: evento.remitente ?? '',
      titulo_publicacion: evento.titulo_publicacion ?? '',
    });
  }

  private programarReintento(): void {
    if (!this.activo) {
      return;
    }
    const espera = Math.min(ESPERA_INICIAL_MS * 2 ** this.intentos, ESPERA_MAXIMA_MS);
    this.intentos++;
    this.temporizador = setTimeout(() => {
      this.temporizador = null;
      if (this.activo) {
        this.abrir();
      }
    }, espera);
  }

  private cancelarReintento(): void {
    if (this.temporizador !== null) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
  }
}
