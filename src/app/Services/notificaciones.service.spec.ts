import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { NotificacionesService, AvisoMensaje } from './notificaciones.service';
import { ConversacionService, MensajeChat } from './conversacion.service';
import { environment } from '../../environments/environment';

class SocketFalso {
  readyState: number = WebSocket.CONNECTING;
  cerradoCon: number | null = null;
  onopen: (() => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onclose: ((e: CloseEvent) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {}

  close(code: number): void {
    this.cerradoCon = code;
    this.readyState = WebSocket.CLOSED;
  }

  abrir(): void {
    this.readyState = WebSocket.OPEN;
    this.onopen?.();
  }

  recibir(datos: unknown): void {
    this.onmessage?.({ data: typeof datos === 'string' ? datos : JSON.stringify(datos) } as MessageEvent);
  }

  cerrar(code: number): void {
    this.readyState = WebSocket.CLOSED;
    this.onerror?.();
    this.onclose?.({ code } as CloseEvent);
  }
}

class ServicioDePrueba extends NotificacionesService {
  sockets: SocketFalso[] = [];

  protected override crearSocket(url: string): WebSocket {
    const socket = new SocketFalso(url);
    this.sockets.push(socket);
    return socket as unknown as WebSocket;
  }

  get ultimo(): SocketFalso {
    return this.sockets[this.sockets.length - 1];
  }
}

const mensaje = (m: Partial<MensajeChat> = {}): MensajeChat => ({
  id_mensaje: 1,
  id_conversacion: 3,
  id_usuario: 10,
  contenido: 'Hola',
  fecha_envio: '2026-11-04T10:30:00',
  estado_lectura: 'no_leido',
  ...m,
});

const aviso = (m: Partial<MensajeChat> = {}) => ({
  tipo: 'nuevo_mensaje',
  mensaje: mensaje(m),
  remitente: 'Ana',
  titulo_publicacion: 'Lucero en venta',
});

describe('NotificacionesService', () => {
  let service: ServicioDePrueba;
  let conversaciones: { contarNoLeidos: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    conversaciones = { contarNoLeidos: vi.fn().mockReturnValue(of({ total: 2 })) };
    TestBed.configureTestingModule({
      providers: [
        { provide: ConversacionService, useValue: conversaciones },
        { provide: NotificacionesService, useClass: ServicioDePrueba },
      ],
    });
    service = TestBed.inject(NotificacionesService) as ServicioDePrueba;
  });

  afterEach(() => {
    service.ngOnDestroy();
    vi.useRealTimers();
  });

  it('should load the unread count and connect once', () => {
    service.iniciar();
    service.iniciar();
    expect(conversaciones.contarNoLeidos).toHaveBeenCalledTimes(1);
    expect(service.noLeidos()).toBe(2);
    expect(service.sockets.length).toBe(1);
    expect(service.ultimo.url).toBe(`${environment.wsUrl}/ws/notificaciones`);
  });

  it('should keep the last count if loading it fails', () => {
    conversaciones.contarNoLeidos.mockReturnValue(throwError(() => new Error('500')));
    service.noLeidos.set(4);
    service.refrescarConteo();
    expect(service.noLeidos()).toBe(4);
  });

  it('should count and announce messages of conversations that are not open', () => {
    const avisos: AvisoMensaje[] = [];
    service.avisos$.subscribe((a) => avisos.push(a));
    service.iniciar();
    service.ultimo.abrir();

    service.ultimo.recibir(aviso({ id_conversacion: 4 }));

    expect(service.noLeidos()).toBe(3);
    expect(avisos).toEqual([
      { mensaje: mensaje({ id_conversacion: 4 }), remitente: 'Ana', titulo_publicacion: 'Lucero en venta' },
    ]);
  });

  it('should not announce the conversation that is open on screen', () => {
    const avisos = vi.fn();
    service.avisos$.subscribe(avisos);
    service.iniciar();
    service.abrirConversacion(3);

    service.ultimo.recibir(aviso({ id_conversacion: 3 }));
    expect(avisos).not.toHaveBeenCalled();
    expect(service.noLeidos()).toBe(2);

    service.cerrarConversacion();
    service.ultimo.recibir(aviso({ id_conversacion: 3 }));
    expect(avisos).toHaveBeenCalledTimes(1);
  });

  it('should ignore unknown or broken events', () => {
    const avisos = vi.fn();
    service.avisos$.subscribe(avisos);
    service.iniciar();
    service.ultimo.recibir('no es json');
    service.ultimo.recibir({ tipo: 'otro' });
    service.ultimo.recibir({ tipo: 'nuevo_mensaje' });
    expect(avisos).not.toHaveBeenCalled();
  });

  it('should fill missing names with empty text', () => {
    const avisos: AvisoMensaje[] = [];
    service.avisos$.subscribe((a) => avisos.push(a));
    service.iniciar();
    service.ultimo.recibir({ tipo: 'nuevo_mensaje', mensaje: mensaje() });
    expect(avisos[0].remitente).toBe('');
    expect(avisos[0].titulo_publicacion).toBe('');
  });

  it('should reconnect with an increasing delay and refresh the count afterwards', () => {
    service.iniciar();
    service.ultimo.cerrar(1006);
    vi.advanceTimersByTime(999);
    expect(service.sockets.length).toBe(1);
    vi.advanceTimersByTime(1);
    expect(service.sockets.length).toBe(2);

    service.ultimo.cerrar(1006);
    vi.advanceTimersByTime(2000);
    expect(service.sockets.length).toBe(3);

    service.ultimo.abrir();
    expect(conversaciones.contarNoLeidos).toHaveBeenCalledTimes(2);
  });

  it('should cap the reconnection delay at 30 seconds', () => {
    service.iniciar();
    for (let i = 0; i < 6; i++) {
      service.ultimo.cerrar(1006);
      vi.advanceTimersByTime(30000);
    }
    const antes = service.sockets.length;
    service.ultimo.cerrar(1006);
    vi.advanceTimersByTime(29999);
    expect(service.sockets.length).toBe(antes);
    vi.advanceTimersByTime(1);
    expect(service.sockets.length).toBe(antes + 1);
  });

  it.each([4401, 1008])('should stop after close code %i and allow starting again', (code) => {
    service.iniciar();
    service.ultimo.cerrar(code);
    vi.advanceTimersByTime(60000);
    expect(service.sockets.length).toBe(1);

    service.iniciar(); // p. ej. tras iniciar sesión de nuevo
    expect(service.sockets.length).toBe(2);
  });

  it('should close cleanly, reset the count and not reconnect after stopping', () => {
    service.iniciar();
    const socket = service.ultimo;
    socket.abrir();

    service.detener();

    expect(socket.cerradoCon).toBe(1000);
    expect(socket.onclose).toBeNull();
    expect(service.noLeidos()).toBe(0);
    vi.advanceTimersByTime(60000);
    expect(service.sockets.length).toBe(1);
  });

  it('should cancel a pending reconnection when stopping', () => {
    service.iniciar();
    service.ultimo.cerrar(1006);
    service.detener();
    vi.advanceTimersByTime(60000);
    expect(service.sockets.length).toBe(1);
  });

  it('should not close an already closed socket or fail without one', () => {
    service.detener();
    service.iniciar();
    const socket = service.ultimo;
    socket.readyState = WebSocket.CLOSED;
    service.detener();
    expect(socket.cerradoCon).toBeNull();
  });

  it('should ignore the close of a previous socket', () => {
    service.iniciar();
    const onclose = service.ultimo.onclose;
    service.detener();
    service.iniciar();
    onclose?.({ code: 1006 } as CloseEvent);
    vi.advanceTimersByTime(60000);
    expect(service.sockets.length).toBe(2);
  });

  it('should not reopen if it was stopped while the retry timer was firing', () => {
    service.iniciar();
    service.ultimo.cerrar(1006);
    (service as unknown as { activo: boolean }).activo = false;
    vi.advanceTimersByTime(1000);
    expect(service.sockets.length).toBe(1);
  });

  it('should complete the notices when destroyed', () => {
    const completo = vi.fn();
    service.avisos$.subscribe({ complete: completo });
    service.ngOnDestroy();
    expect(completo).toHaveBeenCalled();
  });
});
