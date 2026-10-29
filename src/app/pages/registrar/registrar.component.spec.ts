import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { RegistrarComponent } from './registrar.component';
import { RegistroService } from '../../Services/Registro.service';
import { AuthService } from '../../Services/auth.service';

describe('RegistrarComponent', () => {
  let fixture: ComponentFixture<RegistrarComponent>;
  let component: RegistrarComponent;
  let router: Router;
  const registro = { registrar: vi.fn() };
  const auth = { google: vi.fn() };
  let google: { accounts: { id: { initialize: ReturnType<typeof vi.fn>; renderButton: ReturnType<typeof vi.fn> } } };

  const crear = () => {
    fixture = TestBed.createComponent(RegistrarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const llenarValido = () =>
    component.form.setValue({
      nombre: ' Ana López ',
      correo: 'ANA@correo.com',
      contrasena: 'Secreto123',
      confirmar: 'Secreto123',
      telefono: '',
      ubicacion: ' Bogotá ',
    });

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    google = { accounts: { id: { initialize: vi.fn(), renderButton: vi.fn() } } };
    window.google = undefined;
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never;
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await TestBed.configureTestingModule({
      imports: [RegistrarComponent],
      providers: [
        provideRouter([]),
        { provide: RegistroService, useValue: registro },
        { provide: AuthService, useValue: auth },
      ],
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
    expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
  });

  describe('Google', () => {
    it('should give up after 30 attempts if Google never loads', () => {
      crear();
      vi.advanceTimersByTime(250 * 40);
      expect(google.accounts.id.initialize).not.toHaveBeenCalled();
    });

    it('should initialize only once', () => {
      crear();
      window.google = google;
      vi.advanceTimersByTime(250);
      (component as unknown as { inicializarGoogle: () => void }).inicializarGoogle();
      expect(google.accounts.id.initialize).toHaveBeenCalledTimes(1);
      expect(google.accounts.id.renderButton).toHaveBeenCalledTimes(1);
    });

    it('the callback should navigate on success', () => {
      window.google = google;
      auth.google.mockReturnValue(of({}));
      crear();
      google.accounts.id.initialize.mock.calls[0][0].callback({ credential: 'token' });
      expect(auth.google).toHaveBeenCalledWith('token');
      expect(router.navigate).toHaveBeenCalledWith(['/marketplace']);
      expect(component.cargandoGoogle()).toBe(false);
    });

    it('the callback should ignore an empty credential', () => {
      window.google = google;
      crear();
      google.accounts.id.initialize.mock.calls[0][0].callback({ credential: '' });
      expect(auth.google).not.toHaveBeenCalled();
    });

    it('should show the backend error or a generic one', () => {
      window.google = google;
      crear();
      const { callback } = google.accounts.id.initialize.mock.calls[0][0];

      auth.google.mockReturnValue(
        throwError(() => new HttpErrorResponse({ error: { detail: 'Bloqueado' } })),
      );
      callback({ credential: 'token' });
      expect(component.mensaje()).toEqual({ tipo: 'error', texto: 'Bloqueado' });

      auth.google.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
      callback({ credential: 'token' });
      expect(component.mensaje()?.texto).toBe('No fue posible continuar con Google.');
    });
  });

  describe('fuerza', () => {
    beforeEach(() => crear());

    it.each([
      ['', 0],
      ['abcdefgh', 1],
      ['Abcdefgh', 2],
      ['Abcdefgh1', 3],
      ['Abcdefgh1234', 4],
      ['Abcdefgh123!', 5],
    ])('"%s" should score %i', (password, puntos) => {
      component.form.controls.contrasena.setValue(password);
      expect(component.fuerza).toBe(puntos);
    });
  });

  describe('error', () => {
    beforeEach(() => crear());

    it('should be empty while the field is untouched', () => {
      expect(component.error('nombre')).toBe('');
    });

    it('should report required fields', () => {
      component.form.controls.nombre.markAsTouched();
      expect(component.error('nombre')).toBe('Este campo es obligatorio.');
    });

    it('should treat a null password as weak', () => {
      const pass = component.form.controls.contrasena;
      pass.setValue(null as unknown as string);
      expect(pass.hasError('debil')).toBe(true);
    });

    it('should report minlength and maxlength', () => {
      const nombre = component.form.controls.nombre;
      nombre.markAsDirty();
      nombre.setValue('A');
      expect(component.error('nombre')).toBe('Usa al menos 2 caracteres.');
      nombre.setValue('A'.repeat(121));
      expect(component.error('nombre')).toBe('Máximo 120 caracteres.');
    });

    it('should report weak passwords', () => {
      const pass = component.form.controls.contrasena;
      pass.markAsTouched();
      pass.setValue('abcdefgh');
      expect(component.error('contrasena')).toBe('Incluye mayúscula, minúscula y número.');
    });

    it('should report mismatched passwords', () => {
      component.form.controls.contrasena.setValue('Secreto123');
      component.form.controls.confirmar.setValue('Otro12345');
      component.form.controls.confirmar.markAsTouched();
      expect(component.error('confirmar')).toBe('Las contraseñas no coinciden.');
    });

    it('should report invalid phone pattern', () => {
      const tel = component.form.controls.telefono;
      tel.markAsTouched();
      tel.setValue('abc');
      expect(component.error('telefono')).toBe('Usa solo números, espacios, + ( ) y -.');
    });

    it('should report the email pattern message', () => {
      const correo = component.form.controls.correo;
      correo.markAsTouched();
      correo.setValue('x');
      correo.setErrors({ pattern: true });
      expect(component.error('correo')).toBe('Escribe un correo válido.');
    });

    it('should be empty for valid or unknown errors', () => {
      const correo = component.form.controls.correo;
      correo.markAsTouched();
      correo.setValue('no-es-correo');
      expect(component.error('correo')).toBe('');
      correo.setValue('a@a.com');
      expect(component.error('correo')).toBe('');
    });
  });

  describe('enviar', () => {
    beforeEach(() => crear());

    it('should not submit an invalid form', () => {
      component.enviar();
      expect(registro.registrar).not.toHaveBeenCalled();
      expect(component.mensaje()?.texto).toBe('Revisa los campos marcados.');
      expect(component.form.controls.nombre.touched).toBe(true);
    });

    it('should send clean data and go to verification', () => {
      registro.registrar.mockReturnValue(of({}));
      llenarValido();
      component.enviar();
      expect(registro.registrar).toHaveBeenCalledWith({
        nombre: 'Ana López',
        correo: 'ana@correo.com',
        contrasena: 'Secreto123',
        telefono: null,
        ubicacion: 'Bogotá',
      });
      expect(router.navigate).toHaveBeenCalledWith(['/verificar-correo'], {
        queryParams: { correo: 'ana@correo.com' },
      });
      expect(component.cargando()).toBe(false);
    });

    it('should send null location when empty', () => {
      registro.registrar.mockReturnValue(of({}));
      llenarValido();
      component.form.controls.ubicacion.setValue('');
      component.form.controls.telefono.setValue('3001234567');
      component.enviar();
      expect(registro.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ telefono: '3001234567', ubicacion: null }),
      );
    });

    it.each([
      [409, undefined, 'Ese correo ya está registrado.'],
      [0, undefined, 'No hay conexión con el servidor.'],
      [400, { detail: 'Dato inválido' }, 'Dato inválido'],
      [500, undefined, 'No pudimos crear la cuenta.'],
    ])('status %i should show the right message', (status, error, texto) => {
      registro.registrar.mockReturnValue(
        throwError(() => new HttpErrorResponse({ status, error })),
      );
      llenarValido();
      component.enviar();
      expect(component.mensaje()).toEqual({ tipo: 'error', texto });
    });
  });

  describe('irALogin', () => {
    const evento = (target: HTMLElement) =>
      ({ preventDefault: vi.fn(), currentTarget: target }) as unknown as Event;

    const enlaceEnTarjeta = () => {
      const tarjeta = document.createElement('div');
      tarjeta.className = 'card';
      const enlace = document.createElement('a');
      tarjeta.appendChild(enlace);
      return { tarjeta, enlace };
    };

    beforeEach(() => crear());

    it('should navigate immediately without a card', () => {
      component.irALogin(evento(document.createElement('a')));
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should navigate immediately with reduced motion', () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as never;
      const { enlace } = enlaceEnTarjeta();
      component.irALogin(evento(enlace));
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should animate and revert if navigation fails', async () => {
      const { tarjeta, enlace } = enlaceEnTarjeta();
      component.irALogin(evento(enlace));
      expect(tarjeta.classList.contains('volteando')).toBe(true);

      vi.mocked(router.navigate).mockResolvedValue(false);
      await vi.advanceTimersByTimeAsync(500);
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
      expect(tarjeta.classList.contains('volteando')).toBe(false);

      vi.advanceTimersByTime(1100);
      expect(document.body.classList.contains('giro-entrando')).toBe(false);
    });

    it('should keep the card flipped when navigation succeeds', async () => {
      const { tarjeta, enlace } = enlaceEnTarjeta();
      component.irALogin(evento(enlace));
      await vi.advanceTimersByTimeAsync(500);
      expect(tarjeta.classList.contains('volteando')).toBe(true);
    });
  });
});
