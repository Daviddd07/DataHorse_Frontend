import { ChatWebSocketService } from './chat-websocket.service';
import { MensajeChat } from './conversacion.service';
import { environment } from '../../environments/environment';

/* WebSocket falso: los tests deciden cuándo se abre, llega un mensaje o se cierra */
class SocketFalso {
  readyState: number = WebSocket.CONNECTING;
  enviados: string[] = [];
  cerradoCon: number | null = null;
  onopen: (() => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onclose: ((e: CloseEvent) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly url: string) {}

  send(datos: string): void {
    this.enviados.push(datos);
  }

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

class ServicioDePrueba extends ChatWebSocketService {
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

const MENSAJE: MensajeChat = {
  id_mensaje: 1,
  id_conversacion: 3,
  id_usuario: 7,
  contenido: 'Hola',
  fecha_envio: '2026-11-04T10:30:00',
  estado_lectura: 'no_leido',
};

describe('ChatWebSocketService', () => {
  let service: ServicioDePrueba;

  beforeEach(() => {
    vi.useFakeTimers();
    service = new ServicioDePrueba();
  });

  afterEach(() => {
    service.ngOnDestroy();
    vi.useRealTimers();
  });

  it('should connect to the conversation URL', () => {
    const conectado = vi.fn();
    service.conectado$.subscribe(conectado);

    service.conectar(3);
    expect(service.ultimo.url).toBe(`${environment.wsUrl}/ws/conversaciones/3`);
    expect(service.estado()).toBe('conectando');

    service.ultimo.abrir();
    expect(service.estado()).toBe('conectado');
    expect(conectado).toHaveBeenCalledTimes(1);
  });

  it('should send messages only while connected', () => {
    service.conectar(3);
    expect(service.enviar('Hola')).toBe(false);

    service.ultimo.abrir();
    expect(service.enviar('Hola')).toBe(true);
    expect(JSON.parse(service.ultimo.enviados[0])).toEqual({ tipo: 'mensaje', contenido: 'Hola' });
  });

  it('should not send without any connection', () => {
    expect(service.enviar('Hola')).toBe(false);
  });

  it('should emit received messages and server errors', () => {
    const mensajes = vi.fn();
    const errores = vi.fn();
    service.mensajes$.subscribe(mensajes);
    service.errores$.subscribe(errores);
    service.conectar(3);
    service.ultimo.abrir();

    service.ultimo.recibir({ tipo: 'mensaje', mensaje: MENSAJE });
    service.ultimo.recibir({ tipo: 'error', detalle: 'El mensaje no puede estar vacío' });
    service.ultimo.recibir('no es json');
    service.ultimo.recibir({ tipo: 'otro' });

    expect(mensajes).toHaveBeenCalledExactlyOnceWith(MENSAJE);
    expect(errores).toHaveBeenCalledExactlyOnceWith('El mensaje no puede estar vacío');
  });

  it('should reconnect with an increasing delay', () => {
    service.conectar(3);
    service.ultimo.cerrar(1006);
    expect(service.estado()).toBe('reconectando');
    expect(service.sockets.length).toBe(1);

    vi.advanceTimersByTime(1000);
    expect(service.sockets.length).toBe(2);

    service.ultimo.cerrar(1006);
    vi.advanceTimersByTime(1999);
    expect(service.sockets.length).toBe(2);
    vi.advanceTimersByTime(1);
    expect(service.sockets.length).toBe(3);

    // Al conectar se reinicia la espera
    service.ultimo.abrir();
    service.ultimo.cerrar(1006);
    vi.advanceTimersByTime(1000);
    expect(service.sockets.length).toBe(4);
  });

  it('should cap the reconnection delay at 30 seconds', () => {
    service.conectar(3);
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

  it.each([
    [4401, 'Tu sesión expiró. Vuelve a iniciar sesión.'],
    [4403, 'No perteneces a esta conversación.'],
    [4404, 'La conversación no existe.'],
    [1008, 'Conexión no permitida desde este origen.'],
  ])('should not reconnect after close code %i', (code, motivo) => {
    service.conectar(3);
    service.ultimo.cerrar(code);

    expect(service.estado()).toBe('rechazado');
    expect(service.motivoRechazo()).toBe(motivo);
    vi.advanceTimersByTime(60000);
    expect(service.sockets.length).toBe(1);
  });

  it('should close cleanly and not reconnect after disconnecting', () => {
    service.conectar(3);
    const socket = service.ultimo;
    socket.abrir();

    service.desconectar();

    expect(socket.cerradoCon).toBe(1000);
    expect(socket.onclose).toBeNull();
    expect(service.estado()).toBe('desconectado');
    vi.advanceTimersByTime(60000);
    expect(service.sockets.length).toBe(1);
  });

  it('should cancel a pending reconnection when disconnecting', () => {
    service.conectar(3);
    service.ultimo.cerrar(1006);
    service.desconectar();
    vi.advanceTimersByTime(60000);
    expect(service.sockets.length).toBe(1);
  });

  it('should not close an already closed socket again', () => {
    service.conectar(3);
    const socket = service.ultimo;
    socket.readyState = WebSocket.CLOSED;
    service.desconectar();
    expect(socket.cerradoCon).toBeNull();
  });

  it('should ignore the close of a previous connection', () => {
    service.conectar(3);
    const anterior = service.ultimo;
    const onclose = anterior.onclose;
    service.conectar(4);
    service.ultimo.abrir();

    onclose?.({ code: 1006 } as CloseEvent);

    expect(service.estado()).toBe('conectado');
    vi.advanceTimersByTime(60000);
    expect(service.sockets.length).toBe(2);
  });

  it('should keep the rejected state visible after disconnecting', () => {
    service.conectar(3);
    service.ultimo.cerrar(4403);
    service.desconectar();
    expect(service.estado()).toBe('rechazado');
  });

  it('should complete its streams when destroyed', () => {
    const completo = vi.fn();
    service.mensajes$.subscribe({ complete: completo });
    service.ngOnDestroy();
    expect(completo).toHaveBeenCalled();
  });
});
