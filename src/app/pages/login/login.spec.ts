import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { Login } from './login';
import { AuthService } from '../../Services/auth.service';

describe('Login', () => {
  let fixture: ComponentFixture<Login>;
  let component: Login;
  let router: Router;
  const auth = { login: vi.fn(), google: vi.fn() };
  let google: { accounts: { id: { initialize: ReturnType<typeof vi.fn>; renderButton: ReturnType<typeof vi.fn> } } };

  const crear = () => {
    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    google = { accounts: { id: { initialize: vi.fn(), renderButton: vi.fn() } } };
    window.google = undefined;
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never;

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.classList.remove('giro-entrando');
  });

  it('should create and render the form', () => {
    crear();
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.querySelector('form, input')).not.toBeNull();
  });

  describe('Google', () => {
    it('should retry until Google is loaded and stop after 30 attempts', () => {
      crear();
      vi.advanceTimersByTime(250 * 40);
      expect(google.accounts.id.initialize).not.toHaveBeenCalled();
    });

    it('should initialize the button once Google is available', () => {
      crear();
      window.google = google;
      vi.advanceTimersByTime(250);
      expect(google.accounts.id.initialize).toHaveBeenCalledTimes(1);
      expect(google.accounts.id.renderButton).toHaveBeenCalledTimes(1);

      (component as unknown as { inicializarGoogle: () => void }).inicializarGoogle();
      expect(google.accounts.id.initialize).toHaveBeenCalledTimes(1);
    });

    it('the Google callback should log in with the credential', () => {
      window.google = google;
      auth.google.mockReturnValue(of({}));
      crear();
      const { callback } = google.accounts.id.initialize.mock.calls[0][0];
      callback({ credential: 'token' });
      expect(auth.google).toHaveBeenCalledWith('token');
      expect(router.navigate).toHaveBeenCalledWith(['/marketplace']);
      expect(component.cargandoGoogle).toBe(false);
    });

    it('should ignore an empty credential', () => {
      crear();
      component.iniciarConGoogle('');
      expect(auth.google).not.toHaveBeenCalled();
    });

    it('should show the backend error', () => {
      crear();
      auth.google.mockReturnValue(
        throwError(() => new HttpErrorResponse({ error: { detail: 'Cuenta bloqueada' } })),
      );
      component.iniciarConGoogle('token');
      expect(component.mensaje).toBe('Cuenta bloqueada');
      expect(component.cargandoGoogle).toBe(false);
    });

    it('should show a generic error when there is no detail', () => {
      crear();
      auth.google.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      component.iniciarConGoogle('token');
      expect(component.mensaje).toBe('No fue posible iniciar sesión con Google.');
    });
  });

  describe('iniciarSesion', () => {
    beforeEach(() => crear());

    it('should validate empty fields and short passwords', () => {
      component.correo = 'a@a.com';
      component.password = '123';
      component.iniciarSesion();
      expect(component.mensaje).toBe('Contraseña o correo incorrecto.');
      expect(auth.login).not.toHaveBeenCalled();
    });

    it('should normalize the email and navigate on success', () => {
      auth.login.mockReturnValue(of({ mensaje: 'ok' }));
      component.correo = '  A@A.com ';
      component.password = 'Secreto123';
      component.iniciarSesion();
      expect(auth.login).toHaveBeenCalledWith('a@a.com', 'Secreto123');
      expect(router.navigate).toHaveBeenCalledWith(['/marketplace']);
      expect(component.cargando).toBe(false);
    });

    it('should ask for verification on 403', () => {
      auth.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
      component.correo = 'a@a.com';
      component.password = 'Secreto123';
      component.iniciarSesion();
      expect(component.necesitaVerificacion).toBe(true);
      expect(component.mensaje).toContain('verificar');
    });

    it('should show a generic message on other errors', () => {
      auth.login.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
      component.correo = 'a@a.com';
      component.password = 'Secreto123';
      component.iniciarSesion();
      expect(component.necesitaVerificacion).toBe(false);
      expect(component.mensaje).toBe('Contraseña o correo incorrecto.');
    });
  });

  it('limpiarMensaje should reset the message only when there is one', () => {
    crear();
    component.limpiarMensaje();
    expect(component.mensaje).toBe('');

    component.mensaje = 'error';
    component.necesitaVerificacion = true;
    component.limpiarMensaje();
    expect(component.mensaje).toBe('');
    expect(component.necesitaVerificacion).toBe(false);
  });

  describe('irARegistro', () => {
    const evento = (target: HTMLElement) =>
      ({ preventDefault: vi.fn(), currentTarget: target }) as unknown as Event;

    beforeEach(() => crear());

    it('should navigate immediately without a card', () => {
      component.irARegistro(evento(document.createElement('a')));
      expect(router.navigate).toHaveBeenCalledWith(['/registrar']);
    });

    it('should navigate immediately when reduced motion is preferred', () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as never;
      const tarjeta = document.createElement('div');
      tarjeta.className = 'login-card';
      const enlace = document.createElement('a');
      tarjeta.appendChild(enlace);
      component.irARegistro(evento(enlace));
      expect(router.navigate).toHaveBeenCalledWith(['/registrar']);
      expect(tarjeta.classList.contains('volteando')).toBe(false);
    });

    it('should animate the card before navigating', async () => {
      const tarjeta = document.createElement('div');
      tarjeta.className = 'login-card';
      const enlace = document.createElement('a');
      tarjeta.appendChild(enlace);

      component.irARegistro(evento(enlace));
      expect(tarjeta.classList.contains('volteando')).toBe(true);
      expect(document.body.classList.contains('giro-entrando')).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();

      vi.mocked(router.navigate).mockResolvedValue(false);
      await vi.advanceTimersByTimeAsync(500);
      expect(router.navigate).toHaveBeenCalledWith(['/registrar']);
      expect(tarjeta.classList.contains('volteando')).toBe(false);

      vi.advanceTimersByTime(1100);
      expect(document.body.classList.contains('giro-entrando')).toBe(false);
    });

    it('should keep the card flipped when navigation succeeds', async () => {
      const tarjeta = document.createElement('div');
      tarjeta.className = 'login-card';
      const enlace = document.createElement('a');
      tarjeta.appendChild(enlace);

      component.irARegistro(evento(enlace));
      await vi.advanceTimersByTimeAsync(500);
      expect(tarjeta.classList.contains('volteando')).toBe(true);
    });
  });
});
