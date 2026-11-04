import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { ElegirPanelComponent } from './elegir-panel.component';
import { AuthService } from '../../../Services/auth.service';

describe('ElegirPanelComponent', () => {
  let fixture: ComponentFixture<ElegirPanelComponent>;
  let component: ElegirPanelComponent;
  let router: Router;
  let auth: Record<string, ReturnType<typeof vi.fn>>;

  const crear = async () => {
    await TestBed.configureTestingModule({
      imports: [ElegirPanelComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(ElegirPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  beforeEach(() => {
    auth = {
      me: vi.fn().mockReturnValue(of({ id: 1, correo: 'a@a.com', nombre: ' David Manuel ' })),
      logout: vi.fn().mockReturnValue(of({})),
    };
  });

  it('should greet the administrator by first name', async () => {
    await crear();
    expect(component.nombreUsuario()).toBe('David');
    expect(texto()).toContain('Hola, David');
  });

  it('should greet without a name if the user cannot be loaded', async () => {
    auth['me'].mockReturnValue(throwError(() => new Error('500')));
    await crear();
    expect(component.nombreUsuario()).toBe('');
    expect(texto()).toContain('Hola');
    expect(texto()).not.toContain('Hola,');
  });

  it('should show a skeleton instead of the name while it loads', async () => {
    auth['me'].mockReturnValue(NEVER);
    await crear();
    expect(component.cargandoNombre()).toBe(true);
    expect(fixture.nativeElement.querySelector('.nombre-esqueleto')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('h1').getAttribute('aria-busy')).toBe('true');
  });

  it('should navigate to the panel or the marketplace', async () => {
    await crear();
    const [panel, marketplace] = fixture.nativeElement.querySelectorAll('.opcion');
    panel.click();
    expect(router.navigate).toHaveBeenCalledWith(['/admin']);
    marketplace.click();
    expect(router.navigate).toHaveBeenCalledWith(['/marketplace']);
  });

  it('should log out even if the backend fails', async () => {
    await crear();
    component.cerrarSesion();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);

    auth['logout'].mockReturnValue(throwError(() => new Error('500')));
    component.cerrarSesion();
    expect(router.navigate).toHaveBeenCalledTimes(2);
  });
});
