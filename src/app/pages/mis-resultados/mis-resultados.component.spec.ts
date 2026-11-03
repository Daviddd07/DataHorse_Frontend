import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MisResultadosComponent } from './mis-resultados.component';
import { CompatibilidadService, ResumenEstudio } from '../../Services/compatibilidad.service';

const estudio = (e: Partial<ResumenEstudio>): ResumenEstudio => ({
  id_solicitud: 1,
  fecha: '2026-11-03T02:18:20+00:00',
  puntuacion: 81,
  nivel_confianza: 'media',
  caballo: { id_caballo: 10, nombre: 'Juan', raza: 'Criollo', propietario: 'David' },
  yegua: { id_caballo: 8, nombre: 'Sara', raza: 'Cuarto de Milla', propietario: 'David' },
  ...e,
});

const ESTUDIOS = [
  estudio({ id_solicitud: 2, puntuacion: 65, nivel_confianza: 'alta' }),
  estudio({}),
  estudio({ id_solicitud: 3, puntuacion: 30, nivel_confianza: 'baja' }),
];

describe('MisResultadosComponent', () => {
  let fixture: ComponentFixture<MisResultadosComponent>;
  let component: MisResultadosComponent;
  let router: Router;
  let compatibilidad: { listarMisResultados: ReturnType<typeof vi.fn> };

  const html = () => fixture.nativeElement as HTMLElement;
  const items = () => Array.from(html().querySelectorAll<HTMLButtonElement>('.mr-item'));

  const crear = async () => {
    await TestBed.configureTestingModule({
      imports: [MisResultadosComponent],
      providers: [provideRouter([]), { provide: CompatibilidadService, useValue: compatibilidad }],
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(MisResultadosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    compatibilidad = { listarMisResultados: vi.fn().mockReturnValue(of(ESTUDIOS)) };
  });

  it('should list the studies with score, confidence and date', async () => {
    await crear();
    expect(items().length).toBe(3);
    expect(html().querySelector('.mr-total')?.textContent).toContain('3 estudios');
    const primero = items()[0].textContent ?? '';
    expect(primero).toContain('Juan');
    expect(primero).toContain('Sara');
    expect(primero).toContain('65');
    expect(primero).toContain('Confianza alta');
    expect(primero).toMatch(/\d{2}\/11\/2026/);
    expect(items()[0].querySelector('.mr-puntaje')?.classList).toContain('nivel-medio');
    expect(items()[1].querySelector('.mr-puntaje')?.classList).toContain('nivel-alto');
    expect(items()[2].querySelector('.mr-puntaje')?.classList).toContain('nivel-bajo');
  });

  it('should open a saved study without evaluating again', async () => {
    await crear();
    items()[1].click();
    expect(router.navigate).toHaveBeenCalledWith(['/compatibilidad/resultados', 1]);
  });

  it('should use the singular for one study', async () => {
    compatibilidad.listarMisResultados.mockReturnValue(of([ESTUDIOS[0]]));
    await crear();
    expect(html().querySelector('.mr-total')?.textContent).toContain('1 estudio');
  });

  it('should invite to make a study when there are none', async () => {
    compatibilidad.listarMisResultados.mockReturnValue(of([]));
    await crear();
    expect(html().textContent).toContain('Aún no has hecho estudios');
    (html().querySelector('.mr-vacio button') as HTMLButtonElement).click();
    expect(router.navigate).toHaveBeenCalledWith(['/marketplace'], {
      queryParams: { categoria: 'Compatibilidad' },
    });
  });

  it('should show an error and allow retrying', async () => {
    compatibilidad.listarMisResultados.mockReturnValue(throwError(() => new Error('500')));
    await crear();
    expect(html().querySelector('.cr-error')?.textContent).toContain('No fue posible cargar');

    compatibilidad.listarMisResultados.mockReturnValue(of(ESTUDIOS));
    (html().querySelector('.cr-error button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(items().length).toBe(3);
  });

  it('should show the loading state and go back to the marketplace', async () => {
    await crear();
    component.cargando.set(true);
    fixture.detectChanges();
    expect(html().textContent).toContain('Cargando tus estudios');

    (html().querySelector('.cr-volver') as HTMLButtonElement).click();
    expect(router.navigate).toHaveBeenCalledWith(['/marketplace']);
  });
});
