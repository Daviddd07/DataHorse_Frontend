import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { ConversacionesComponent } from './conversaciones.component';
import { ChatWebSocketService, EstadoChat } from '../../Services/chat-websocket.service';
import {
  AvisoMensaje,
  CambioPresencia,
  ConversacionFinalizada,
  NotificacionesService,
} from '../../Services/notificaciones.service';
import {
  ConversacionService,
  MensajeChat,
  ResumenConversacion,
} from '../../Services/conversacion.service';

const resumen = (r: Partial<ResumenConversacion> = {}): ResumenConversacion => ({
  id_conversacion: 3,
  id_publicacion: 8,
  titulo_publicacion: 'Lucero en venta',
  soy_vendedor: false,
  otro_usuario: { id: 10, nombre: 'Vendedor' },
  ultimo_mensaje: 'Hola',
  fecha_ultimo_mensaje: '2026-11-04T10:30:00',
  ultimo_mensaje_es_mio: true,
  no_leidos: 0,
  fecha_creacion: '2026-11-04',
  ...r,
});

const mensaje = (m: Partial<MensajeChat> = {}): MensajeChat => ({
  id_mensaje: 1,
  id_conversacion: 3,
  id_usuario: 7,
  contenido: 'Hola',
  fecha_envio: '2026-11-04T10:30:00',
  estado_lectura: 'no_leido',
  ...m,
});

class ChatFalso {
  estado = signal<EstadoChat>('desconectado');
  motivoRechazo = signal('');
  mensajes$ = new Subject<MensajeChat>();
  errores$ = new Subject<string>();
  conectado$ = new Subject<void>();
  finalizada$ = new Subject<number>();
  conectar = vi.fn((_id: number) => this.estado.set('conectado'));
  desconectar = vi.fn();
  enviar = vi.fn((_contenido: string) => true);
}

describe('ConversacionesComponent', () => {
  let fixture: ComponentFixture<ConversacionesComponent>;
  let component: ConversacionesComponent;
  let router: Router;
  let chat: ChatFalso;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let conversaciones: Record<string, ReturnType<typeof vi.fn>>;
  let notificaciones: {
    avisos$: Subject<AvisoMensaje>;
    presencia$: Subject<CambioPresencia>;
    finalizadas$: Subject<ConversacionFinalizada>;
    abrirConversacion: ReturnType<typeof vi.fn>;
    cerrarConversacion: ReturnType<typeof vi.fn>;
    refrescarConteo: ReturnType<typeof vi.fn>;
  };

  const crear = async (id: string | null = '3') => {
    params = new BehaviorSubject(convertToParamMap(id ? { id } : {}));
    await TestBed.configureTestingModule({
      imports: [ConversacionesComponent],
      providers: [
        provideRouter([]),
        { provide: ConversacionService, useValue: conversaciones },
        { provide: NotificacionesService, useValue: notificaciones },
        { provide: ActivatedRoute, useValue: { paramMap: params } },
      ],
    })
      .overrideComponent(ConversacionesComponent, {
        set: { providers: [{ provide: ChatWebSocketService, useValue: chat }] },
      })
      .compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(ConversacionesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const texto = () => fixture.nativeElement.textContent as string;

  beforeEach(() => {
    chat = new ChatFalso();
    notificaciones = {
      avisos$: new Subject<AvisoMensaje>(),
      presencia$: new Subject<CambioPresencia>(),
      finalizadas$: new Subject<ConversacionFinalizada>(),
      abrirConversacion: vi.fn(),
      cerrarConversacion: vi.fn(),
      refrescarConteo: vi.fn(),
    };
    conversaciones = {
      marcarLeidos: vi.fn().mockReturnValue(of({ marcados: 1 })),
      finalizar: vi.fn().mockReturnValue(of({ id_conversacion: 3, estado: 'finalizada' })),
      calificar: vi
        .fn()
        .mockReturnValue(
          of({ resena: { id_resena: 1 }, calificacion_evaluado: { promedio: 4.5, total: 2 } }),
        ),
      listar: vi.fn().mockReturnValue(of([resumen(), resumen({ id_conversacion: 4 })])),
      obtener: vi.fn().mockReturnValue(
        of({
          conversacion: resumen(),
          mensajes: [mensaje(), mensaje({ id_mensaje: 2, id_usuario: 10, contenido: 'Buenas' })],
        }),
      ),
    };
  });

  it('should load the list and open the conversation from the URL', async () => {
    await crear();
    expect(conversaciones['listar']).toHaveBeenCalled();
    expect(conversaciones['obtener']).toHaveBeenCalledWith(3);
    expect(chat.conectar).toHaveBeenCalledWith(3);
    expect(component.mensajes().length).toBe(2);
    fixture.detectChanges();
    expect(texto()).toContain('Buenas');
    // Sin datos de conexión del otro participante se muestra "Inactivo"
    expect(texto()).toContain('Inactivo');
  });

  it('should show each user avatar left of the name (photo or initial)', async () => {
    conversaciones['listar'].mockReturnValue(
      of([
        resumen(),
        resumen({
          id_conversacion: 4,
          otro_usuario: { id: 11, nombre: 'Ana', foto_perfil: '/uploads/perfiles/ana.jpg' },
        }),
      ]),
    );
    await crear();
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;

    const [sinFoto, conFoto] = Array.from(html.querySelectorAll('.cv-item app-avatar'));
    expect(sinFoto.textContent?.trim()).toBe('V');
    expect((conFoto.querySelector('img') as HTMLImageElement).src).toContain(
      '/uploads/perfiles/ana.jpg',
    );

    // El avatar va antes del nombre, en la lista y en la cabecera del chat
    // (en la lista el avatar va junto al punto de "en línea")
    const primero = html.querySelector('.cv-item')?.firstElementChild;
    expect(primero?.classList.contains('cv-avatar-con-estado')).toBe(true);
    expect(primero?.firstElementChild?.tagName).toBe('APP-AVATAR');
    expect(html.querySelector('.cv-cabecera app-avatar')?.textContent?.trim()).toBe('V');
  });

  it('should tell my messages from the other participant ones', async () => {
    await crear();
    expect(component.esMio(mensaje({ id_usuario: 7 }))).toBe(true);
    expect(component.esMio(mensaje({ id_usuario: 10 }))).toBe(false);
    component.activa.set(null);
    expect(component.esMio(mensaje())).toBe(false);
  });

  it('should show a hint when no conversation is selected', async () => {
    await crear(null);
    expect(conversaciones['obtener']).not.toHaveBeenCalled();
    expect(chat.desconectar).toHaveBeenCalled();
    expect(texto()).toContain('Elige una conversación');
  });

  it('should show an empty state without conversations', async () => {
    conversaciones['listar'].mockReturnValue(of([]));
    await crear(null);
    expect(texto()).toContain('Aún no tienes conversaciones');
  });

  it('should show an error if the list fails', async () => {
    conversaciones['listar'].mockReturnValue(throwError(() => new Error('500')));
    await crear(null);
    expect(component.errorLista()).toBe('No fue posible cargar tus conversaciones.');
  });

  it.each([
    [403, 'No tienes acceso a esta conversación.'],
    [404, 'No tienes acceso a esta conversación.'],
    [500, 'No fue posible cargar la conversación.'],
  ])('should show an error if the conversation fails with %i', async (status, detalle) => {
    conversaciones['obtener'].mockReturnValue(throwError(() => ({ status })));
    await crear();
    expect(component.errorMensajes()).toBe(detalle);
    expect(chat.conectar).not.toHaveBeenCalled();
  });

  it('should ignore a late response from a previous conversation', async () => {
    const tardia = new Subject<unknown>();
    conversaciones['obtener'].mockReturnValueOnce(tardia);
    await crear();
    params.next(convertToParamMap({ id: '4' }));
    tardia.next({ conversacion: resumen(), mensajes: [] });
    tardia.error({ status: 500 });
    expect(component.idActiva()).toBe(4);
    expect(component.errorMensajes()).toBe('');
    expect(chat.conectar).toHaveBeenCalledExactlyOnceWith(4);
  });

  it('should send the message and clear the box', async () => {
    await crear();
    component.texto.set('  Hola vendedor ');
    component.enviar();
    expect(chat.enviar).toHaveBeenCalledWith('Hola vendedor');
    expect(component.texto()).toBe('');
  });

  it('should not send empty messages', async () => {
    await crear();
    component.texto.set('   ');
    component.enviar();
    expect(chat.enviar).not.toHaveBeenCalled();
  });

  it('should keep the text if there is no connection', async () => {
    await crear();
    chat.enviar.mockReturnValue(false);
    component.texto.set('Hola');
    component.enviar();
    expect(component.texto()).toBe('Hola');
    expect(component.errorEnvio()).toBe('Sin conexión con el chat. Reintentando…');
  });

  it('should send with Enter but not with Shift+Enter', async () => {
    await crear();
    component.texto.set('Hola');
    component.alPresionarTecla(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }));
    expect(chat.enviar).not.toHaveBeenCalled();
    component.alPresionarTecla(new KeyboardEvent('keydown', { key: 'a' }));
    expect(chat.enviar).not.toHaveBeenCalled();
    component.alPresionarTecla(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(chat.enviar).toHaveBeenCalledWith('Hola');
  });

  it('should update the text from the textarea', async () => {
    await crear();
    component.errorEnvio.set('x');
    const area = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    area.value = 'Hola';
    area.dispatchEvent(new Event('input'));
    expect(component.texto()).toBe('Hola');
    expect(component.errorEnvio()).toBe('');
    expect(component.puedeEnviar()).toBe(true);
  });

  it('should add messages received in real time without duplicates', async () => {
    await crear();
    chat.mensajes$.next(mensaje({ id_mensaje: 5, id_usuario: 10, contenido: 'Nuevo' }));
    chat.mensajes$.next(mensaje({ id_mensaje: 5, id_usuario: 10, contenido: 'Nuevo' }));
    expect(component.mensajes().map((m) => m.id_mensaje)).toEqual([1, 2, 5]);

    const [primera] = component.lista();
    expect(primera.ultimo_mensaje).toBe('Nuevo');
    expect(primera.ultimo_mensaje_es_mio).toBe(false);
  });

  it('should move a conversation with a new message to the top of the list', async () => {
    await crear();
    chat.mensajes$.next(mensaje({ id_mensaje: 9, id_conversacion: 4 }));
    expect(component.lista()[0].id_conversacion).toBe(4);
    expect(component.mensajes().length).toBe(2); // no es la conversación abierta
  });

  it('should reload the list for an unknown conversation', async () => {
    await crear();
    chat.mensajes$.next(mensaje({ id_mensaje: 9, id_conversacion: 99 }));
    expect(conversaciones['listar']).toHaveBeenCalledTimes(2);
  });

  it('should show server errors', async () => {
    await crear();
    chat.errores$.next('El mensaje no puede estar vacío');
    expect(component.errorEnvio()).toBe('El mensaje no puede estar vacío');
  });

  it('should reload the history after reconnecting', async () => {
    await crear();
    chat.conectado$.next(); // primera conexión: ya se cargó
    expect(conversaciones['obtener']).toHaveBeenCalledTimes(1);

    conversaciones['obtener'].mockReturnValue(
      of({ conversacion: resumen(), mensajes: [mensaje({ id_mensaje: 7 })] }),
    );
    chat.conectado$.next();
    expect(component.mensajes().map((m) => m.id_mensaje)).toEqual([7]);
  });

  it('should keep the messages if reloading after reconnecting fails', async () => {
    await crear();
    chat.conectado$.next();
    conversaciones['obtener'].mockReturnValue(throwError(() => new Error('500')));
    chat.conectado$.next();
    expect(component.mensajes().length).toBe(2);
  });

  it('should not reload the history without an active conversation', async () => {
    await crear(null);
    chat.conectado$.next();
    chat.conectado$.next();
    expect(conversaciones['obtener']).not.toHaveBeenCalled();
  });

  it('should show the rejection and allow retrying', async () => {
    await crear();
    chat.estado.set('rechazado');
    chat.motivoRechazo.set('Tu sesión expiró. Vuelve a iniciar sesión.');
    fixture.detectChanges();
    expect(texto()).toContain('Tu sesión expiró');

    component.reconectar();
    expect(conversaciones['obtener']).toHaveBeenCalledTimes(2);
    expect(chat.conectar).toHaveBeenCalledTimes(2);
  });

  it('should not retry without an active conversation', async () => {
    await crear(null);
    component.reconectar();
    expect(conversaciones['obtener']).not.toHaveBeenCalled();
  });

  it('should navigate between list, conversation and marketplace', async () => {
    await crear();
    component.abrir(resumen({ id_conversacion: 4 }));
    expect(router.navigate).toHaveBeenCalledWith(['/conversaciones', 4]);
    component.volverALista();
    expect(router.navigate).toHaveBeenCalledWith(['/conversaciones']);
    component.volverAlMarketplace();
    expect(router.navigate).toHaveBeenCalledWith(['/marketplace']);
  });

  it('should close the WebSocket when leaving the chat', async () => {
    await crear();
    chat.desconectar.mockClear();
    fixture.destroy();
    expect(chat.desconectar).toHaveBeenCalled();
    expect(notificaciones.cerrarConversacion).toHaveBeenCalled();
  });

  /* ---------- Leídos y avisos ---------- */

  it('should mark the open conversation as read and refresh the counter', async () => {
    conversaciones['listar'].mockReturnValue(
      of([resumen({ no_leidos: 2 }), resumen({ id_conversacion: 4, no_leidos: 1 })]),
    );
    await crear();
    expect(notificaciones.abrirConversacion).toHaveBeenCalledWith(3);
    expect(conversaciones['marcarLeidos']).toHaveBeenCalledWith(3);
    expect(notificaciones.refrescarConteo).toHaveBeenCalled();
    expect(component.lista().map((c) => c.no_leidos)).toEqual([0, 1]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.cv-no-leidos').length).toBe(1);
  });

  it('should tolerate a failure when marking as read', async () => {
    conversaciones['marcarLeidos'].mockReturnValue(throwError(() => new Error('500')));
    await crear();
    expect(notificaciones.refrescarConteo).not.toHaveBeenCalled();
    chat.mensajes$.next(mensaje({ id_mensaje: 8, id_usuario: 10 }));
    expect(component.mensajes().length).toBe(3);
  });

  it('should mark as read the messages the other participant sends while I am watching', async () => {
    await crear();
    conversaciones['marcarLeidos'].mockClear();
    chat.mensajes$.next(mensaje({ id_mensaje: 5, id_usuario: 7 })); // mío: nada que marcar
    expect(conversaciones['marcarLeidos']).not.toHaveBeenCalled();
    chat.mensajes$.next(mensaje({ id_mensaje: 6, id_usuario: 10 }));
    expect(conversaciones['marcarLeidos']).toHaveBeenCalledWith(3);
    expect(component.lista()[0].no_leidos).toBe(0);
  });

  it('should count in the list the messages of other conversations', async () => {
    await crear();
    const aviso = (m: Partial<MensajeChat>): AvisoMensaje => ({
      mensaje: mensaje(m),
      remitente: 'Vendedor',
      titulo_publicacion: 'Lucero en venta',
    });
    notificaciones.avisos$.next(aviso({ id_mensaje: 9, id_conversacion: 4, id_usuario: 10 }));
    notificaciones.avisos$.next(aviso({ id_mensaje: 10, id_conversacion: 3, id_usuario: 10 })); // la abierta: se ignora
    const otra = component.lista().find((c) => c.id_conversacion === 4);
    expect(otra?.no_leidos).toBe(1);
    expect(component.lista()[0].id_conversacion).toBe(4);
    expect(component.mensajes().length).toBe(2);
  });

  it('should stop ignoring notices after leaving the conversation', async () => {
    await crear();
    params.next(convertToParamMap({}));
    expect(notificaciones.cerrarConversacion).toHaveBeenCalled();
  });

  /* ---------- Estrellas y estado en línea ---------- */

  const conDatos = (r: Partial<ResumenConversacion> = {}) =>
    resumen({
      otro_usuario: {
        id: 10,
        nombre: 'Vendedor',
        calificacion: { promedio: 4.5, total: 8 },
        conexion: { en_linea: true, ultima_conexion: '2026-11-08T10:00:00' },
      },
      ...r,
    });

  it('should show the stars and online status of the other person', async () => {
    conversaciones['listar'].mockReturnValue(of([conDatos()]));
    conversaciones['obtener'].mockReturnValue(of({ conversacion: conDatos(), mensajes: [] }));
    await crear();
    fixture.detectChanges();
    const cabecera = fixture.nativeElement.querySelector('.cv-cabecera') as HTMLElement;
    expect(cabecera.textContent).toContain('En línea');
    expect(cabecera.querySelector('app-estrellas')?.getAttribute('aria-label')).toBe(
      '4,5 de 5 estrellas, 8 reseñas',
    );
    expect(fixture.nativeElement.querySelector('.cv-item app-estrellas')).not.toBeNull();
  });

  it('should update the online status when a contact comes and goes', async () => {
    conversaciones['listar'].mockReturnValue(of([conDatos()]));
    conversaciones['obtener'].mockReturnValue(of({ conversacion: conDatos(), mensajes: [] }));
    await crear();

    notificaciones.presencia$.next({
      id_usuario: 10,
      en_linea: false,
      ultima_conexion: '2026-11-08T10:05:00',
    });
    notificaciones.presencia$.next({ id_usuario: 99, en_linea: true, ultima_conexion: null });

    expect(component.activa()?.otro_usuario.conexion).toEqual({
      en_linea: false,
      ultima_conexion: '2026-11-08T10:05:00',
    });
    expect(component.lista()[0].otro_usuario.conexion?.en_linea).toBe(false);
  });

  it('should show my own connection problems only while reconnecting', async () => {
    await crear();
    chat.estado.set('reconectando');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cv-estado')?.textContent).toContain(
      'Reconectando',
    );
    chat.estado.set('conectado');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cv-estado')).toBeNull();
  });

  /* ---------- Finalizar el chat ---------- */

  it('should ask for confirmation and finalize the chat', async () => {
    await crear();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.cv-finalizar') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(texto()).toContain('¿Finalizar el chat con Vendedor?');

    component.finalizar();
    fixture.detectChanges();

    expect(conversaciones['finalizar']).toHaveBeenCalledWith(3);
    expect(component.finalizada()).toBe(true);
    expect(component.confirmandoFinalizar()).toBe(false);
    expect(component.lista()[0].finalizada).toBe(true);
    expect(fixture.nativeElement.querySelector('.cv-envio')).toBeNull();
    expect(texto()).toContain('Este chat está finalizado.');
    expect(texto()).toContain('¿Cómo fue tu experiencia con Vendedor?');
    expect(component.puedeEnviar()).toBe(false);
  });

  it('should cancel finalizing', async () => {
    await crear();
    component.pedirFinalizar();
    component.cancelarFinalizar();
    expect(component.confirmandoFinalizar()).toBe(false);
    expect(conversaciones['finalizar']).not.toHaveBeenCalled();
  });

  it('should show an error if finalizing fails and ignore double clicks', async () => {
    const pendiente = new Subject<unknown>();
    conversaciones['finalizar'].mockReturnValue(pendiente);
    await crear();
    component.finalizar();
    component.finalizar();
    expect(conversaciones['finalizar']).toHaveBeenCalledTimes(1);
    pendiente.error(new Error('500'));
    expect(component.errorFinalizar()).toBe('No se pudo finalizar el chat. Intenta de nuevo.');
    expect(component.finalizada()).toBe(false);
  });

  it('should not finalize without an active conversation', async () => {
    await crear(null);
    component.finalizar();
    expect(conversaciones['finalizar']).not.toHaveBeenCalled();
  });

  it('should close the chat when the other person finalizes it', async () => {
    await crear();
    component.pedirFinalizar();
    chat.finalizada$.next(10);
    expect(component.finalizada()).toBe(true);
    expect(component.confirmandoFinalizar()).toBe(false);
  });

  it('should ignore a finalized event without an active conversation', async () => {
    await crear(null);
    chat.finalizada$.next(10);
    expect(component.lista().every((c) => !c.finalizada)).toBe(true);
  });

  it('should mark in the list the conversations finalized by others', async () => {
    await crear();
    notificaciones.finalizadas$.next({ id_conversacion: 4, por: 'Vendedor' });
    expect(component.lista().find((c) => c.id_conversacion === 4)?.finalizada).toBe(true);
    expect(component.finalizada()).toBe(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.cv-etiqueta-finalizada')).not.toBeNull();
  });

  it('should reopen the chat when a new message arrives', async () => {
    conversaciones['obtener'].mockReturnValue(
      of({ conversacion: resumen({ finalizada: true, estado: 'finalizada' }), mensajes: [] }),
    );
    await crear();
    expect(component.finalizada()).toBe(true);
    chat.mensajes$.next(mensaje({ id_mensaje: 20, id_usuario: 10 }));
    expect(component.finalizada()).toBe(false);
    expect(component.lista()[0].finalizada).toBe(false);
  });

  /* ---------- Reseña ---------- */

  const abrirFinalizada = async (r: Partial<ResumenConversacion> = {}) => {
    conversaciones['obtener'].mockReturnValue(
      of({
        conversacion: resumen({
          finalizada: true,
          estado: 'finalizada',
          ya_califique: false,
          ...r,
        }),
        mensajes: [],
      }),
    );
    await crear();
    fixture.detectChanges();
  };

  it('should rate the other person from 1 to 5 stars with a comment', async () => {
    await abrirFinalizada();
    const estrellas = Array.from(
      fixture.nativeElement.querySelectorAll('.cv-selector-estrellas button'),
    ) as HTMLButtonElement[];
    expect(estrellas.length).toBe(5);

    estrellas[3].dispatchEvent(new Event('mouseenter'));
    fixture.detectChanges();
    expect(estrellas.filter((b) => b.classList.contains('llena')).length).toBe(4);
    estrellas[3].click();
    estrellas[3].dispatchEvent(new Event('blur'));

    const area = fixture.nativeElement.querySelector('.cv-resena textarea') as HTMLTextAreaElement;
    area.value = '  Muy serio  ';
    area.dispatchEvent(new Event('input'));
    component.enviarResena();
    fixture.detectChanges();

    expect(conversaciones['calificar']).toHaveBeenCalledWith(3, 4, 'Muy serio');
    expect(component.activa()?.ya_califique).toBe(true);
    expect(component.activa()?.otro_usuario.calificacion).toEqual({ promedio: 4.5, total: 2 });
    expect(component.lista()[0].otro_usuario.calificacion).toEqual({ promedio: 4.5, total: 2 });
    expect(texto()).toContain('¡Gracias! Calificaste a Vendedor con 4 estrellas.');
  });

  it('should say "estrella" in singular for one star and send no empty comment', async () => {
    await abrirFinalizada();
    component.elegirEstrellas(1);
    component.enviarResena();
    fixture.detectChanges();
    expect(conversaciones['calificar']).toHaveBeenCalledWith(3, 1, null);
    expect(texto()).toContain('con 1 estrella.');
  });

  it('should require choosing the stars', async () => {
    await abrirFinalizada();
    component.enviarResena();
    expect(component.errorResena()).toBe('Elige de 1 a 5 estrellas.');
    expect(conversaciones['calificar']).not.toHaveBeenCalled();
  });

  it('should not send a review without an active conversation', async () => {
    await crear(null);
    component.elegirEstrellas(5);
    component.enviarResena();
    expect(conversaciones['calificar']).not.toHaveBeenCalled();
  });

  it('should treat a duplicated review as already rated', async () => {
    conversaciones['calificar'].mockReturnValue(throwError(() => ({ status: 409 })));
    await abrirFinalizada();
    component.elegirEstrellas(5);
    component.enviarResena();
    fixture.detectChanges();
    expect(component.activa()?.ya_califique).toBe(true);
    expect(component.errorResena()).toBe('');
    expect(texto()).toContain('Ya calificaste a Vendedor en este chat.');
  });

  it('should show an error if the review fails', async () => {
    conversaciones['calificar'].mockReturnValue(throwError(() => ({ status: 500 })));
    await abrirFinalizada();
    component.elegirEstrellas(3);
    component.enviarResena();
    expect(component.errorResena()).toBe('No se pudo guardar tu reseña. Intenta de nuevo.');
    expect(component.enviandoResena()).toBe(false);
  });

  it('should ignore the review answer if the conversation was closed meanwhile', async () => {
    const pendiente = new Subject<unknown>();
    conversaciones['calificar'].mockReturnValue(pendiente);
    await abrirFinalizada();
    component.elegirEstrellas(5);
    component.enviarResena();
    component.enviarResena(); // doble clic mientras se envía
    expect(conversaciones['calificar']).toHaveBeenCalledTimes(1);
    component.activa.set(null);
    pendiente.next({ resena: {}, calificacion_evaluado: { promedio: 5, total: 1 } });
    expect(component.resenaEnviada()).toBe(5);
  });

  it('should ignore a 409 if the conversation was closed meanwhile', async () => {
    const pendiente = new Subject<unknown>();
    conversaciones['calificar'].mockReturnValue(pendiente);
    await abrirFinalizada();
    component.elegirEstrellas(5);
    component.enviarResena();
    component.activa.set(null);
    pendiente.error({ status: 409 });
    expect(component.errorResena()).toBe('No se pudo guardar tu reseña. Intenta de nuevo.');
  });

  it('should not ask for a review I already left', async () => {
    await abrirFinalizada({ ya_califique: true });
    expect(fixture.nativeElement.querySelector('.cv-resena')).toBeNull();
    expect(texto()).toContain('Ya calificaste a Vendedor en este chat.');
  });

  it('should tell the buyer how to reopen a finalized chat, but not the seller', async () => {
    await abrirFinalizada();
    expect(texto()).toContain('«Chatear con el vendedor»');
    conversaciones['obtener'].mockReturnValue(
      of({ conversacion: resumen({ finalizada: true, soy_vendedor: true }), mensajes: [] }),
    );
    params.next(convertToParamMap({ id: '4' }));
    fixture.detectChanges();
    expect(texto()).not.toContain('«Chatear con el vendedor»');
  });
});
