import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { RecuperarPasswordComponent } from './recuperar-password.component';
import { AuthService } from '../../Services/auth.service';

describe('RecuperarPasswordComponent', () => {
  let fixture: ComponentFixture<RecuperarPasswordComponent>;
  let component: RecuperarPasswordComponent;
  let router: Router;
  const auth = { forgotPassword: vi.fn(), resetPassword: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [RecuperarPasswordComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(RecuperarPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should start on step 1', () => {
    expect(component.paso).toBe(1);
    expect(fixture.nativeElement.querySelector('#correo')).not.toBeNull();
  });

  describe('template interaction', () => {
    const escribir = (selector: string, valor: string) => {
      const input = fixture.nativeElement.querySelector(selector) as HTMLInputElement;
      input.value = valor;
      input.dispatchEvent(new Event('input'));
    };

    it('should complete both steps from the DOM', async () => {
      auth.forgotPassword.mockReturnValue(of({ mensaje: 'Código enviado' }));
      auth.resetPassword.mockReturnValue(of({ mensaje: 'ok' }));

      (fixture.nativeElement.querySelector('button.primario') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.mensaje').textContent).toContain(
        'Ingresa tu correo.',
      );

      escribir('#correo', 'ana@correo.com');
      (fixture.nativeElement.querySelector('button.primario') as HTMLButtonElement).click();
      expect(component.paso).toBe(2);
      await fixture.whenStable();

      escribir('#codigo', '123456');
      escribir('#nuevaPassword', 'Secreto123');
      escribir('#confirmarPassword', 'Secreto123');
      const botones = fixture.nativeElement.querySelectorAll('button.ver');
      (botones[1] as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(component.verConfirmar).toBe(true);
      expect(fixture.nativeElement.querySelector('.mensaje').textContent).toContain(
        'Código enviado',
      );

      (fixture.nativeElement.querySelector('button.primario') as HTMLButtonElement).click();
      expect(auth.resetPassword).toHaveBeenCalledWith('ana@correo.com', '123456', 'Secreto123');
    });

    it('should show the loading text and errors on step 2', () => {
      component.paso = 2;
      component.cargando = true;
      component.mensaje = 'Error';
      component.error = true;
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.error-msg')).not.toBeNull();

      component.paso = 1;
      fixture.componentRef.changeDetectorRef.markForCheck();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button.primario').textContent).toContain(
        'Enviando...',
      );
    });
  });

  describe('enviarCodigo', () => {
    it('should require an email', () => {
      component.correo = '   ';
      component.enviarCodigo();
      expect(component.error).toBe(true);
      expect(component.mensaje).toBe('Ingresa tu correo.');
      expect(auth.forgotPassword).not.toHaveBeenCalled();
    });

    it('should move to step 2 on success', () => {
      auth.forgotPassword.mockReturnValue(of({ mensaje: 'Código enviado' }));
      component.correo = ' ANA@correo.com ';
      component.enviarCodigo();
      expect(auth.forgotPassword).toHaveBeenCalledWith('ana@correo.com');
      expect(component.paso).toBe(2);
      expect(component.mensaje).toBe('Código enviado');
      expect(component.error).toBe(false);
      expect(fixture.nativeElement.querySelector('#codigo')).not.toBeNull();
    });

    it('should show the backend error', () => {
      auth.forgotPassword.mockReturnValue(
        throwError(() => new HttpErrorResponse({ error: { detail: 'No existe' } })),
      );
      component.correo = 'a@a.com';
      component.enviarCodigo();
      expect(component.error).toBe(true);
      expect(component.mensaje).toBe('No existe');
      expect(component.paso).toBe(1);
    });

    it('should show a default error', () => {
      auth.forgotPassword.mockReturnValue(throwError(() => new HttpErrorResponse({})));
      component.correo = 'a@a.com';
      component.enviarCodigo();
      expect(component.mensaje).toBe('No fue posible enviar el código.');
    });
  });

  describe('cambiarPassword', () => {
    beforeEach(() => {
      component.paso = 2;
      component.correo = 'a@a.com';
      fixture.detectChanges();
    });

    it('should toggle password visibility in the template', () => {
      const botones = fixture.nativeElement.querySelectorAll('button.ver');
      (botones[0] as HTMLButtonElement).click();
      (botones[1] as HTMLButtonElement)?.click();
      fixture.detectChanges();
      expect(component.verPass).toBe(true);
      expect(fixture.nativeElement.querySelector('#nuevaPassword').type).toBe('text');
    });

    it('should validate the code', () => {
      component.codigo = '12';
      component.cambiarPassword();
      expect(component.mensaje).toBe('El código debe tener 6 dígitos.');
    });

    it('should validate the password length', () => {
      component.codigo = '123456';
      component.nuevaPassword = 'corta';
      component.cambiarPassword();
      expect(component.mensaje).toBe('La contraseña debe tener mínimo 8 caracteres.');
    });

    it('should validate the confirmation', () => {
      component.codigo = '123456';
      component.nuevaPassword = 'Secreto123';
      component.confirmarPassword = 'Otro12345';
      component.cambiarPassword();
      expect(component.mensaje).toBe('Las contraseñas no coinciden.');
      expect(auth.resetPassword).not.toHaveBeenCalled();
    });

    const llenar = () => {
      component.codigo = ' 123456 ';
      component.nuevaPassword = 'Secreto123';
      component.confirmarPassword = 'Secreto123';
    };

    it('should reset and go to login', () => {
      auth.resetPassword.mockReturnValue(of({ mensaje: 'ok' }));
      llenar();
      component.cambiarPassword();
      expect(auth.resetPassword).toHaveBeenCalledWith('a@a.com', '123456', 'Secreto123');
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
      expect(component.cargando).toBe(false);
    });

    it('should show the backend error', () => {
      auth.resetPassword.mockReturnValue(
        throwError(() => new HttpErrorResponse({ error: { detail: 'Código vencido' } })),
      );
      llenar();
      component.cambiarPassword();
      expect(component.mensaje).toBe('Código vencido');
      expect(component.error).toBe(true);
    });

    it('should show a default error', () => {
      auth.resetPassword.mockReturnValue(throwError(() => new HttpErrorResponse({})));
      llenar();
      component.cambiarPassword();
      expect(component.mensaje).toBe('No fue posible cambiar la contraseña.');
    });
  });
});
