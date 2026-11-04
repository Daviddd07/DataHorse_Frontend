import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import {
  CompatibilidadResultadoComponent,
  MS_POR_PASO,
  PASOS_ANALISIS,
} from './compatibilidad-resultado.component';
import {
  CompatibilidadService,
  EvaluacionCompatibilidad,
} from '../../Services/compatibilidad.service';

const EVALUACION: EvaluacionCompatibilidad = {
  resultado: {
    puntuacion: 81,
    raza_puntos: 70,
    madurez_puntos: 90,
    altura_puntos: 100,
    ubicacion_puntos: 45,
    otros_puntos: 80,
    nivel_confianza: 'media',
    resumen_cria: 'Se espera un potro equilibrado.',
    fortalezas: ['Edad óptima'],
    riesgos: ['Distancia'],
    recomendaciones: ['Pruebas genéticas'],
    datos_faltantes_importantes: [],
    modelo: 'openai/gpt-oss-120b',
  },
  caballo: { id_caballo: 10, nombre: 'Juan', raza: 'Criollo', propietario: 'David' },
  yegua: { id_caballo: 8, nombre: 'Sara', raza: 'Cuarto de Milla', propietario: 'Ana' },
  desde_cache: false,
  evaluaciones_restantes_hoy: 4,
  aviso: 'Consulta a un médico veterinario.',
};

describe('CompatibilidadResultadoComponent', () => {
  let fixture: ComponentFixture<CompatibilidadResultadoComponent>;
  let component: CompatibilidadResultadoComponent;
  let router: Router;
  let compatibilidad: Record<string, ReturnType<typeof vi.fn>>;

  const html = () => fixture.nativeElement as HTMLElement;

  const crear = async (params: Record<string, string> = { idCaballo: '10', idYegua: '8' }) => {
    await TestBed.configureTestingModule({
      imports: [CompatibilidadResultadoComponent],
      providers: [
        provideRouter([]),
        { provide: CompatibilidadService, useValue: compatibilidad },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(params) } },
        },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(CompatibilidadResultadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    compatibilidad = {
      evaluar: vi.fn().mockReturnValue(of(structuredClone(EVALUACION))),
      obtenerResultado: vi.fn().mockReturnValue(
        of({
          ...structuredClone(EVALUACION),
          desde_cache: true,
          id_solicitud: 5,
          fecha: '2026-11-03T02:18:20+00:00',
        }),
      ),
      obtenerCupo: vi.fn().mockReturnValue(of({ limite: 5, usadas: 1, restantes: 4 })),
    };
  });

  it('should evaluate the pair from the URL and show the result', async () => {
    await crear();

    expect(compatibilidad['evaluar']).toHaveBeenCalledWith(10, 8);
    expect(component.cupo()?.restantes).toBe(4);
    const texto = html().textContent ?? '';
    expect(texto).toContain('Juan');
    expect(texto).toContain('de David');
    expect(texto).toContain('81/100');
    expect(texto).toContain('Confianza media');
    expect(texto).toContain('Se espera un potro equilibrado.');
    expect(texto).toContain('Consulta a un médico veterinario.');
    expect(texto).not.toContain('no gastó estimación');
    expect(html().querySelectorAll('.cr-barras li').length).toBe(5);
    // Lista vacía muestra "Sin datos"
    expect(html().querySelector('.cr-faltantes')?.textContent).toContain('Sin datos');
  });

  it('should color scores by level', async () => {
    await crear();
    expect(component.nivel(80)).toBe('alto');
    expect(component.nivel(60)).toBe('medio');
    expect(component.nivel(20)).toBe('bajo');
    expect(html().querySelector('.cr-anillo')?.classList).toContain('nivel-alto');
    expect(component.fondoAnillo(50)).toContain('180deg');
    expect(component.etiquetaConfianza('alta')).toBe('Confianza alta');
  });

  it('should say when the saved result was reused', async () => {
    compatibilidad['evaluar'].mockReturnValue(of({ ...EVALUACION, desde_cache: true }));
    await crear();
    expect(html().textContent).toContain('Resultado guardado · no gastó estimación');
  });

  it('should show the backend error and allow retrying', async () => {
    compatibilidad['evaluar'].mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 429,
            error: { detail: 'Alcanzaste el límite de 5 evaluaciones por hoy.' },
          }),
      ),
    );
    compatibilidad['obtenerCupo'].mockReturnValue(throwError(() => new Error('500')));
    await crear();

    expect(html().querySelector('.cr-error')?.textContent).toContain('límite de 5');
    expect(component.cupo()).toBeNull();

    compatibilidad['evaluar'].mockReturnValue(of(EVALUACION));
    (html().querySelector('.cr-error .cr-secundario') as HTMLButtonElement).click();
    expect(component.error()).toBe('');
    expect(component.evaluacion()).toEqual(EVALUACION);
  });

  it('should show a generic error without detail', async () => {
    compatibilidad['evaluar'].mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0 })),
    );
    await crear();
    expect(component.error()).toBe('No fue posible realizar el estudio. Intenta de nuevo.');
  });

  it('should reject invalid ids without calling the API', async () => {
    await crear({ idCaballo: 'abc', idYegua: '8' });
    expect(compatibilidad['evaluar']).not.toHaveBeenCalled();
    expect(component.error()).toBe('El estudio solicitado no es válido.');
  });

  it('should have no categories without a result', async () => {
    await crear();
    component.evaluacion.set(null);
    expect(component.categorias()).toEqual([]);
  });

  it('should show the loading state', async () => {
    await crear();
    component.cargando.set(true);
    fixture.detectChanges();
    expect(html().textContent).toContain('Analizando con inteligencia artificial');
  });

  describe('AI analysis', () => {
    afterEach(() => vi.useRealTimers());

    it('should rotate what the AI is analyzing and stop on the last step', async () => {
      vi.useFakeTimers();
      compatibilidad['evaluar'].mockReturnValue(NEVER);
      await crear();
      const paso = () => html().querySelector('.cr-ia-paso')?.textContent?.trim();

      expect(html().querySelector('.cr-orbe app-logo-ia')).not.toBeNull();
      expect(paso()).toBe(PASOS_ANALISIS[0]);

      vi.advanceTimersByTime(MS_POR_PASO);
      fixture.detectChanges();
      expect(paso()).toBe(PASOS_ANALISIS[1]);

      vi.advanceTimersByTime(MS_POR_PASO * PASOS_ANALISIS.length * 2);
      fixture.detectChanges();
      expect(paso()).toBe(PASOS_ANALISIS.at(-1));
      expect(vi.getTimerCount()).toBe(0);
    });

    it('should stop rotating once the result arrives', async () => {
      vi.useFakeTimers();
      await crear();
      expect(vi.getTimerCount()).toBe(0);
      expect(html().querySelector('.cr-sello-ia')?.textContent).toContain(
        'Análisis generado por IA',
      );
    });

    it('should not rotate messages when opening a saved study', async () => {
      vi.useFakeTimers();
      compatibilidad['obtenerResultado'].mockReturnValue(NEVER);
      await crear({ idSolicitud: '5' });
      expect(html().querySelector('.cr-ia-paso')).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  it('should navigate back to the marketplace or start a new evaluation', async () => {
    await crear();
    component.nuevaEvaluacion();
    expect(router.navigate).toHaveBeenCalledWith(['/marketplace'], {
      queryParams: { categoria: 'Compatibilidad' },
    });
    (html().querySelector('.cr-volver') as HTMLButtonElement).click();
    expect(router.navigate).toHaveBeenCalledWith(['/marketplace']);

    const misResultados = Array.from(html().querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Mis resultados'),
    ) as HTMLButtonElement;
    misResultados.click();
    expect(router.navigate).toHaveBeenCalledWith(['/compatibilidad/mis-resultados']);
  });

  describe('saved study (from "Mis resultados")', () => {
    it('should load it by id without evaluating again', async () => {
      await crear({ idSolicitud: '5' });

      expect(component.esGuardado).toBe(true);
      expect(compatibilidad['obtenerResultado']).toHaveBeenCalledWith(5);
      expect(compatibilidad['evaluar']).not.toHaveBeenCalled();
      const texto = html().textContent ?? '';
      expect(texto).toMatch(/Estudio realizado el \d{2}\/11\/2026/);
      expect(texto).toContain('81/100');
      expect(texto).toContain('no gastó estimación');
    });

    it('should not show a date for a new study', async () => {
      await crear();
      expect(html().textContent).not.toContain('Estudio realizado el');
    });

    it('should show its own loading text', async () => {
      await crear({ idSolicitud: '5' });
      component.cargando.set(true);
      fixture.detectChanges();
      expect(html().textContent).toContain('Cargando el estudio guardado');
      expect(html().textContent).not.toContain('Analizando');
    });

    it('should reject an invalid id', async () => {
      await crear({ idSolicitud: '0' });
      expect(compatibilidad['obtenerResultado']).not.toHaveBeenCalled();
      expect(component.error()).toBe('El estudio solicitado no es válido.');
    });

    it('should show the error when the study belongs to someone else', async () => {
      compatibilidad['obtenerResultado'].mockReturnValue(
        throwError(
          () => new HttpErrorResponse({ status: 404, error: { detail: 'Estudio no encontrado' } }),
        ),
      );
      await crear({ idSolicitud: '99' });
      expect(component.error()).toBe('Estudio no encontrado');
    });
  });
});
