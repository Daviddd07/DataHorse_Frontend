import { Component, ElementRef, OnDestroy, computed, inject, signal, viewChild } from '@angular/core';

import { DatePipe } from '@angular/common';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ActivatedRoute, Router } from '@angular/router';

import { ChatWebSocketService } from '../../Services/chat-websocket.service';

import { AvisoMensaje, NotificacionesService } from '../../Services/notificaciones.service';

import {
  ConversacionService,
  MensajeChat,
  ResumenConversacion,
} from '../../Services/conversacion.service';

const LONGITUD_MAXIMA = 2000;

@Component({
  selector: 'app-conversaciones',
  standalone: true,
  imports: [DatePipe],
  // Una conexión WebSocket por pantalla de chat: se cierra al salir de ella
  providers: [ChatWebSocketService],
  templateUrl: './conversaciones.component.html',
  // Comparte el estilo base de las páginas de compatibilidad (fondo, paneles y botones)
  styleUrls: [
    '../compatibilidad-resultado/compatibilidad-resultado.component.css',
    './conversaciones.component.css',
  ],
})
export class ConversacionesComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly conversaciones = inject(ConversacionService);
  private readonly notificaciones = inject(NotificacionesService);
  readonly chat = inject(ChatWebSocketService);

  private readonly contenedorMensajes = viewChild<ElementRef<HTMLElement>>('contenedorMensajes');

  readonly longitudMaxima = LONGITUD_MAXIMA;

  lista = signal<ResumenConversacion[]>([]);
  cargandoLista = signal(true);
  errorLista = signal('');

  idActiva = signal<number | null>(null);
  activa = signal<ResumenConversacion | null>(null);
  mensajes = signal<MensajeChat[]>([]);
  cargandoMensajes = signal(false);
  errorMensajes = signal('');

  texto = signal('');
  errorEnvio = signal('');

  puedeEnviar = computed(
    () => this.chat.estado() === 'conectado' && this.texto().trim().length > 0,
  );

  constructor() {
    this.cargarLista();

    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const id = Number(params.get('id'));
      if (id) {
        this.seleccionar(id);
      } else {
        this.limpiarActiva();
      }
    });

    this.chat.mensajes$.pipe(takeUntilDestroyed()).subscribe((m) => this.recibir(m));

    this.chat.errores$.pipe(takeUntilDestroyed()).subscribe((detalle) => this.errorEnvio.set(detalle));

    // Mensajes de las otras conversaciones (no abiertas): solo actualizan la lista
    this.notificaciones.avisos$
      .pipe(takeUntilDestroyed())
      .subscribe((aviso) => this.avisoDeOtraConversacion(aviso));

    // Tras una reconexión se recarga el historial por si llegaron mensajes mientras tanto
    let primeraConexion = true;
    this.chat.conectado$.pipe(takeUntilDestroyed()).subscribe(() => {
      if (primeraConexion) {
        primeraConexion = false;
        return;
      }
      this.recargarHistorial();
    });
  }

  ngOnDestroy(): void {
    this.chat.desconectar();
    this.notificaciones.cerrarConversacion();
  }

  /* ---------- Lista de conversaciones ---------- */

  cargarLista(): void {
    this.cargandoLista.set(true);
    this.errorLista.set('');

    this.conversaciones.listar().subscribe({
      next: (lista) => {
        this.lista.set(lista);
        this.cargandoLista.set(false);
      },
      error: () => {
        this.errorLista.set('No fue posible cargar tus conversaciones.');
        this.cargandoLista.set(false);
      },
    });
  }

  abrir(conversacion: ResumenConversacion): void {
    void this.router.navigate(['/conversaciones', conversacion.id_conversacion]);
  }

  volverALista(): void {
    void this.router.navigate(['/conversaciones']);
  }

  volverAlMarketplace(): void {
    void this.router.navigate(['/marketplace']);
  }

  /* ---------- Conversación activa ---------- */

  private seleccionar(id: number): void {
    this.chat.desconectar();
    this.notificaciones.abrirConversacion(id);
    this.idActiva.set(id);
    this.activa.set(null);
    this.mensajes.set([]);
    this.texto.set('');
    this.errorEnvio.set('');
    this.errorMensajes.set('');
    this.cargandoMensajes.set(true);

    this.conversaciones.obtener(id).subscribe({
      next: ({ conversacion, mensajes }) => {
        if (this.idActiva() !== id) {
          return; // el usuario ya cambió de conversación
        }
        this.activa.set(conversacion);
        this.mensajes.set(mensajes);
        this.cargandoMensajes.set(false);
        this.bajarAlFinal();
        this.chat.conectar(id);
        this.marcarLeidos(id);
      },
      error: (err: { status?: number }) => {
        if (this.idActiva() !== id) {
          return;
        }
        this.errorMensajes.set(
          err?.status === 403 || err?.status === 404
            ? 'No tienes acceso a esta conversación.'
            : 'No fue posible cargar la conversación.',
        );
        this.cargandoMensajes.set(false);
      },
    });
  }

  private limpiarActiva(): void {
    this.chat.desconectar();
    this.notificaciones.cerrarConversacion();
    this.idActiva.set(null);
    this.activa.set(null);
    this.mensajes.set([]);
  }

  private recargarHistorial(): void {
    const id = this.idActiva();
    if (id === null) {
      return;
    }
    this.conversaciones.obtener(id).subscribe({
      next: ({ mensajes }) => {
        if (this.idActiva() === id) {
          this.mensajes.set(mensajes);
          this.bajarAlFinal();
        }
      },
      error: () => undefined, // se conserva lo que ya se ve
    });
  }

  private marcarLeidos(id: number): void {
    this.conversaciones.marcarLeidos(id).subscribe({
      next: () => {
        this.lista.update((lista) =>
          lista.map((c) => (c.id_conversacion === id ? { ...c, no_leidos: 0 } : c)),
        );
        this.notificaciones.refrescarConteo();
      },
      error: () => undefined, // se reintentará la próxima vez que se abra
    });
  }

  private avisoDeOtraConversacion(aviso: AvisoMensaje): void {
    if (aviso.mensaje.id_conversacion !== this.idActiva()) {
      this.actualizarLista(aviso.mensaje, true);
    }
  }

  private recibir(mensaje: MensajeChat): void {
    const esActiva = mensaje.id_conversacion === this.idActiva();
    if (esActiva) {
      const yaEsta = this.mensajes().some((m) => m.id_mensaje === mensaje.id_mensaje);
      if (!yaEsta) {
        this.mensajes.update((actuales) => [...actuales, mensaje]);
        this.bajarAlFinal();
      }
      // Lo estoy viendo: si me lo envió el otro, queda leído
      const activa = this.activa();
      if (activa && mensaje.id_usuario === activa.otro_usuario.id) {
        this.conversaciones.marcarLeidos(mensaje.id_conversacion).subscribe({
          error: () => undefined,
        });
      }
    }
    this.actualizarLista(mensaje, !esActiva);
  }

  /** Vista previa en la lista, con la conversación arriba. */
  private actualizarLista(mensaje: MensajeChat, sumarNoLeido: boolean): void {
    const resumen = this.lista().find((c) => c.id_conversacion === mensaje.id_conversacion);
    if (!resumen) {
      this.cargarLista();
      return;
    }
    const delOtro = mensaje.id_usuario === resumen.otro_usuario.id;
    const actualizado: ResumenConversacion = {
      ...resumen,
      ultimo_mensaje: mensaje.contenido,
      fecha_ultimo_mensaje: mensaje.fecha_envio,
      ultimo_mensaje_es_mio: !delOtro,
      no_leidos: resumen.no_leidos + (sumarNoLeido && delOtro ? 1 : 0),
    };
    this.lista.update((lista) => [
      actualizado,
      ...lista.filter((c) => c.id_conversacion !== mensaje.id_conversacion),
    ]);
  }

  esMio(mensaje: MensajeChat): boolean {
    const activa = this.activa();
    return !!activa && mensaje.id_usuario !== activa.otro_usuario.id;
  }

  /* ---------- Envío ---------- */

  escribir(evento: Event): void {
    this.texto.set((evento.target as HTMLTextAreaElement).value);
    this.errorEnvio.set('');
  }

  alPresionarTecla(evento: KeyboardEvent): void {
    // Enter envía; Shift+Enter hace salto de línea
    if (evento.key === 'Enter' && !evento.shiftKey) {
      evento.preventDefault();
      this.enviar();
    }
  }

  enviar(): void {
    const contenido = this.texto().trim();
    if (!contenido) {
      return;
    }
    if (this.chat.enviar(contenido)) {
      this.texto.set('');
      this.errorEnvio.set('');
    } else {
      this.errorEnvio.set('Sin conexión con el chat. Reintentando…');
    }
  }

  reconectar(): void {
    const id = this.idActiva();
    if (id !== null) {
      this.seleccionar(id);
    }
  }

  private bajarAlFinal(): void {
    setTimeout(() => {
      const el = this.contenedorMensajes()?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }
}
