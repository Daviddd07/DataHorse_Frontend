import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { AvisoMensajeComponent } from './aviso-mensaje.component';
import { AvisoMensaje, NotificacionesService } from '../../Services/notificaciones.service';

const AVISO: AvisoMensaje = {
  mensaje: {
    id_mensaje: 1,
    id_conversacion: 3,
    id_usuario: 10,
    contenido: 'Hola, ¿sigue disponible?',
    fecha_envio: '2026-11-04T10:30:00',
    estado_lectura: 'no_leido',
  },
  remitente: 'Ana',
  titulo_publicacion: 'Lucero en venta',
};

describe('AvisoMensajeComponent', () => {
  let fixture: ComponentFixture<AvisoMensajeComponent>;
  let component: AvisoMensajeComponent;
  let router: Router;
  let avisos$: Subject<AvisoMensaje>;

  beforeEach(async () => {
    vi.useFakeTimers();
    avisos$ = new Subject();
    await TestBed.configureTestingModule({
      imports: [AvisoMensajeComponent],
      providers: [provideRouter([]), { provide: NotificacionesService, useValue: { avisos$ } }],
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(AvisoMensajeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => vi.useRealTimers());

  const html = () => fixture.nativeElement as HTMLElement;

  it('should show nothing until a message arrives', () => {
    expect(html().querySelector('.am')).toBeNull();
  });

  it('should show who wrote and what', () => {
    avisos$.next(AVISO);
    fixture.detectChanges();
    expect(html().textContent).toContain('Nuevo mensaje de Ana');
    expect(html().textContent).toContain('Lucero en venta');
    expect(html().textContent).toContain('Hola, ¿sigue disponible?');
  });

  it('should hide by itself after a few seconds', () => {
    avisos$.next(AVISO);
    vi.advanceTimersByTime(5999);
    expect(component.aviso()).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(component.aviso()).toBeNull();
  });

  it('should restart the timer with each new message', () => {
    avisos$.next(AVISO);
    vi.advanceTimersByTime(5000);
    avisos$.next({ ...AVISO, remitente: 'Luis' });
    vi.advanceTimersByTime(5000);
    expect(component.aviso()?.remitente).toBe('Luis');
  });

  it('should open the conversation when clicked', () => {
    avisos$.next(AVISO);
    fixture.detectChanges();
    (html().querySelector('.am-cuerpo') as HTMLButtonElement).click();
    expect(router.navigate).toHaveBeenCalledWith(['/conversaciones', 3]);
    expect(component.aviso()).toBeNull();
  });

  it('should close with the X', () => {
    avisos$.next(AVISO);
    fixture.detectChanges();
    (html().querySelector('.am-cerrar') as HTMLButtonElement).click();
    expect(component.aviso()).toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should do nothing when opening without a notice', () => {
    component.abrir();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should clear the timer when destroyed', () => {
    avisos$.next(AVISO);
    fixture.destroy();
    vi.advanceTimersByTime(10000);
    expect(component.aviso()).not.toBeNull();
  });
});
