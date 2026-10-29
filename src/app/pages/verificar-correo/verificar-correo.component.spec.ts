import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { VerificarCorreoComponent } from './verificar-correo.component';
import { RegistroService } from '../../Services/Registro.service';

describe('VerificarCorreoComponent', () => {
  let fixture: ComponentFixture<VerificarCorreoComponent>;
  let component: VerificarCorreoComponent;
  let router: Router;
  const registro = { verificarCorreo: vi.fn(), reenviarCodigo: vi.fn() };

  const configurar = async (correo: string | null) => {
    await TestBed.configureTestingModule({
      imports: [VerificarCorreoComponent],
      providers: [
        provideRouter([]),
        { provide: RegistroService, useValue: registro },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap(correo ? { correo } : {}) },
          },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(VerificarCorreoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => vi.useRealTimers());

  describe('with an email in the URL', () => {
    beforeEach(() => configurar('ana@correo.com'));

    it('should read the email and render it', () => {
      expect(component.correo).toBe('ana@correo.com');
      expect(fixture.nativeElement.textContent).toContain('ana@correo.com');
    });

    it('should verify and resend from the DOM', () => {
      registro.verificarCorreo.mockReturnValue(of({ mensaje: 'ok' }));
      registro.reenviarCodigo.mockReturnValue(of({ mensaje: 'ok' }));
      const input = fixture.nativeElement.querySelector('.codigo-input') as HTMLInputElement;
      input.value = '123456';
      input.dispatchEvent(new Event('input'));
      expect(component.codigo()).toBe('123456');

      (fixture.nativeElement.querySelector('button.secundario') as HTMLButtonElement).click();
      expect(registro.reenviarCodigo).toHaveBeenCalled();
      vi.advanceTimersByTime(2000);
      fixture.detectChanges();

      (fixture.nativeElement.querySelector('button.primario') as HTMLButtonElement).click();
      expect(registro.verificarCorreo).toHaveBeenCalledWith('ana@correo.com', '123456');
    });

    it('should render the loading states', () => {
      component.cargando.set(true);
      component.reenviando.set(true);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('button.primario').textContent).toContain(
        'Verificando...',
      );
      expect(fixture.nativeElement.querySelector('button.secundario').textContent).toContain(
        'Enviando...',
      );
    });

    it('onCodigoChange should clear a previous error', () => {
      component.onCodigoChange('1');
      expect(component.codigo()).toBe('1');

      component.esError.set(true);
      component.mensaje.set('error');
      component.onCodigoChange('12');
      expect(component.esError()).toBe(false);
      expect(component.mensaje()).toBe('');
    });

    it('should reject codes that are not 6 digits and clear the error later', () => {
      component.codigo.set('12a');
      component.verificar();
      expect(registro.verificarCorreo).not.toHaveBeenCalled();
      expect(component.esError()).toBe(true);
      expect(component.animandoError()).toBe(true);
      fixture.detectChanges();

      vi.advanceTimersByTime(500);
      expect(component.animandoError()).toBe(false);
      vi.advanceTimersByTime(2500);
      expect(component.esError()).toBe(false);
      expect(component.mensaje()).toBe('');
    });

    it('should keep the message if the error was already cleared', () => {
      component.verificar();
      component.esError.set(false);
      component.mensaje.set('otro');
      vi.advanceTimersByTime(3000);
      expect(component.mensaje()).toBe('otro');
    });

    it('should verify and redirect to login', () => {
      registro.verificarCorreo.mockReturnValue(of({ mensaje: 'ok' }));
      component.codigo.set(' 123456 ');
      component.verificar();
      expect(registro.verificarCorreo).toHaveBeenCalledWith('ana@correo.com', '123456');
      expect(component.exito()).toBe(true);
      expect(component.cargando()).toBe(false);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.check-icon')).not.toBeNull();

      vi.advanceTimersByTime(1500);
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should show the backend error fixing broken accents', () => {
      registro.verificarCorreo.mockReturnValue(
        throwError(() => new HttpErrorResponse({ error: { detail: 'CÃ³digo vencido' } })),
      );
      component.codigo.set('123456');
      component.verificar();
      expect(component.mensaje()).toBe('Código vencido');
      expect(component.esError()).toBe(true);
    });

    it('should show a default error when verification fails without detail', () => {
      registro.verificarCorreo.mockReturnValue(throwError(() => new HttpErrorResponse({})));
      component.codigo.set('123456');
      component.verificar();
      expect(component.mensaje()).toBe('Código incorrecto o expirado.');
    });

    it('should resend the code and reset the success state', () => {
      registro.reenviarCodigo.mockReturnValue(of({ mensaje: 'ok' }));
      component.reenviar();
      expect(registro.reenviarCodigo).toHaveBeenCalledWith('ana@correo.com');
      expect(component.exito()).toBe(true);
      expect(component.reenviando()).toBe(false);

      vi.advanceTimersByTime(2000);
      expect(component.exito()).toBe(false);
      expect(component.animandoExito()).toBe(false);
      expect(component.mensaje()).toBe('');
    });

    it('should show the resend error fixing broken accents', () => {
      registro.reenviarCodigo.mockReturnValue(
        throwError(() => new HttpErrorResponse({ error: { detail: 'Espera un minuto (Ã³)' } })),
      );
      component.reenviar();
      expect(component.mensaje()).toBe('Espera un minuto (ó)');
    });

    it('should show a default resend error', () => {
      registro.reenviarCodigo.mockReturnValue(throwError(() => new HttpErrorResponse({})));
      component.reenviar();
      expect(component.mensaje()).toBe('No fue posible reenviar el código.');
    });
  });

  describe('without an email', () => {
    beforeEach(() => configurar(null));

    it('verificar should fail without calling the API', () => {
      component.codigo.set('123456');
      component.verificar();
      expect(registro.verificarCorreo).not.toHaveBeenCalled();
      expect(component.esError()).toBe(true);
    });

    it('reenviar should fail without calling the API', () => {
      component.reenviar();
      expect(registro.reenviarCodigo).not.toHaveBeenCalled();
      expect(component.mensaje()).toBe('No se encontró el correo.');
    });
  });
});
