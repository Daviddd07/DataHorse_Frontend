import { Injectable, OnDestroy, signal } from '@angular/core';

import { Observable, Subject } from 'rxjs';

import { environment } from '../../environments/environment';

import { MensajeChat } from './conversacion.service';

export type EstadoChat = 'desconectado' | 'conectando' | 'conectado' | 'reconectando' | 'rechazado';

/* Códigos de cierre del backend tras los que no tiene sentido reintentar */
const CIERRES_DEFINITIVOS: Record<number, string> = {
  1008: 'Conexión no permitida desde este origen.',
  4401: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  4403: 'No perteneces a esta conversación.',
  4404: 'La conversación no existe.',
};

const ESPERA_INICIAL_MS = 1000;
const ESPERA_MAXIMA_MS = 30000;

/**
 * Solo WebSocket del chat: conecta a una conversación, envía y recibe mensajes
 * y reconecta con espera creciente (1s, 2s, 4s... hasta 30s).
 * Se provee por componente: cada pantalla de chat tiene su propia conexión.
 * La sesión viaja en la cookie httpOnly, igual que en las peticiones REST.
 */
@Injectable()
export class ChatWebSocketService implements OnDestroy {
  readonly estado = signal<EstadoChat>('desconectado');
  readonly motivoRechazo = signal('');

  private readonly mensajesSubject = new Subject<MensajeChat>();
  private readonly erroresSubject = new Subject<string>();
  private readonly conectadoSubject = new Subject<void>();

  /** Mensajes nuevos de la conversación (propios y del otro participante). */
  readonly mensajes$: Observable<MensajeChat> = this.mensajesSubject.asObservable();
  /** Errores que el servidor devuelve sin cortar la conexión (p. ej. mensaje vacío). */
  readonly errores$: Observable<string> = this.erroresSubject.asObservable();
  /** Cada vez que la conexión queda abierta (la primera y tras reconectar). */
  readonly conectado$: Observable<void> = this.conectadoSubject.asObservable();

  private socket: WebSocket | null = null;
  private idConversacion: number | null = null;
  private intentos = 0;
  private temporizador: ReturnType<typeof setTimeout> | null = null;

  conectar(idConversacion: number): void {
    this.desconectar();
    this.idConversacion = idConversacion;
    this.intentos = 0;
    this.motivoRechazo.set('');
    this.abrir('conectando');
  }

  /** Cierre voluntario (al salir del chat o cambiar de conversación): no reconecta. */
  desconectar(): void {
    this.idConversacion = null;
    this.cancelarReintento();

    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close(1000, 'Salió del chat');
      }
    }

    if (this.estado() !== 'rechazado') {
      this.estado.set('desconectado');
    }
  }

  /** Devuelve false si no hay conexión abierta (el mensaje no se envió). */
  enviar(contenido: string): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return false;
    }
    this.socket.send(JSON.stringify({ tipo: 'mensaje', contenido }));
    return true;
  }

  ngOnDestroy(): void {
    this.desconectar();
    this.mensajesSubject.complete();
    this.erroresSubject.complete();
    this.conectadoSubject.complete();
  }

  /** Punto de extensión para las pruebas. */
  protected crearSocket(url: string): WebSocket {
    return new WebSocket(url);
  }

  private abrir(estado: EstadoChat): void {
    if (this.idConversacion === null) {
      return;
    }

    this.estado.set(estado);
    const socket = this.crearSocket(`${environment.wsUrl}/ws/conversaciones/${this.idConversacion}`);
    this.socket = socket;

    socket.onopen = () => {
      this.intentos = 0;
      this.estado.set('conectado');
      this.conectadoSubject.next();
    };

    socket.onmessage = (evento: MessageEvent) => this.procesar(evento.data);

    socket.onclose = (evento: CloseEvent) => {
      if (this.socket !== socket) {
        return; // cierre de una conexión anterior
      }
      this.socket = null;

      const definitivo = CIERRES_DEFINITIVOS[evento.code];
      if (definitivo) {
        this.motivoRechazo.set(definitivo);
        this.estado.set('rechazado');
        this.idConversacion = null;
        return;
      }

      this.programarReintento();
    };

    // onerror siempre va seguido de onclose, que decide si reintentar.
    socket.onerror = () => undefined;
  }

  private procesar(datos: unknown): void {
    let evento: { tipo?: string; mensaje?: MensajeChat; detalle?: string };
    try {
      evento = JSON.parse(String(datos));
    } catch {
      return;
    }

    if (evento.tipo === 'mensaje' && evento.mensaje) {
      this.mensajesSubject.next(evento.mensaje);
    } else if (evento.tipo === 'error' && evento.detalle) {
      this.erroresSubject.next(evento.detalle);
    }
  }

  private programarReintento(): void {
    if (this.idConversacion === null) {
      return;
    }
    const espera = Math.min(ESPERA_INICIAL_MS * 2 ** this.intentos, ESPERA_MAXIMA_MS);
    this.intentos++;
    this.estado.set('reconectando');
    this.temporizador = setTimeout(() => {
      this.temporizador = null;
      this.abrir('reconectando');
    }, espera);
  }

  private cancelarReintento(): void {
    if (this.temporizador !== null) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
  }
}
