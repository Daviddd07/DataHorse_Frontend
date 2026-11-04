import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  CaballoElegible,
  CompatibilidadSelectorComponent,
  edadEnAnios,
} from './compatibilidad-selector.component';
import { CaballoService } from '../../../Services/caballo.service';
import { CompatibilidadService } from '../../../Services/compatibilidad.service';

const caballo = (c: Partial<CaballoElegible>): CaballoElegible => ({
  idCaballo: 10,
  nombre: 'Juan',
  raza: 'Criollo',
  sexo: 'Macho',
  ubicacion: 'Cali',
  propietario: 'David',
  esMia: false,
  fotoPrincipal: null,
  fondo: '#222',
  edad: 4,
  altura: 1.3,
  ...c,
});

const CABALLOS = [
  caballo({}),
  caballo({ idCaballo: 3, nombre: 'Maik', fotoPrincipal: 'http://x/maik.png', esMia: true }),
  caballo({ idCaballo: 7, nombre: 'Luna', sexo: 'Hembra' }),
];

const MIOS = [
  {
    id_caballo: 8,
    nombre: 'Sara',
    sexo: 'Hembra',
    raza: 'Cuarto de Milla',
    ubicacion: 'Tocancipá',
    foto_principal: '/uploads/sara.png',
    fecha_nacimiento: '2023-03-09',
    altura: 1.3,
  },
  {
    id_caballo: 7,
    nombre: 'Luna',
    sexo: 'Hembra',
    raza: 'Árabe',
    ubicacion: 'Bogotá',
    foto_principal: null,
    fecha_nacimiento: '2025-06-20',
    altura: 1.5,
  },
  {
    id_caballo: 10,
    nombre: 'Juan',
    sexo: 'Macho',
    raza: 'Criollo',
    ubicacion: 'Cali',
    foto_principal: null,
    fecha_nacimiento: '2022-01-06',
    altura: 1.3,
  },
];

describe('CompatibilidadSelectorComponent', () => {
  let fixture: ComponentFixture<CompatibilidadSelectorComponent>;
  let component: CompatibilidadSelectorComponent;
  let router: Router;
  let caballoService: { listarMisCaballos: ReturnType<typeof vi.fn> };
  let compatibilidad: { obtenerCupo: ReturnType<typeof vi.fn> };

  const html = () => fixture.nativeElement as HTMLElement;
  const tarjetas = () => Array.from(html().querySelectorAll<HTMLButtonElement>('.cs-card'));
  const boton = (texto: string) =>
    Array.from(html().querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(texto),
    );
  const clic = (elemento: HTMLElement | undefined) => {
    elemento!.click();
    fixture.detectChanges();
  };

  const crear = async () => {
    await TestBed.configureTestingModule({
      imports: [CompatibilidadSelectorComponent],
      providers: [
        provideRouter([]),
        { provide: CaballoService, useValue: caballoService },
        { provide: CompatibilidadService, useValue: compatibilidad },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(CompatibilidadSelectorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('caballos', CABALLOS);
    fixture.detectChanges();
  };

  beforeEach(() => {
    caballoService = { listarMisCaballos: vi.fn().mockReturnValue(of(MIOS)) };
    compatibilidad = {
      obtenerCupo: vi.fn().mockReturnValue(of({ limite: 5, usadas: 1, restantes: 4 })),
    };
  });

  it('should show the remaining estimations and only stallions in step 1', async () => {
    await crear();
    expect(component.cupo()).toEqual({ limite: 5, usadas: 1, restantes: 4 });
    expect(html().textContent).toContain('Te quedan');
    expect(tarjetas().map((t) => t.textContent)).toEqual([
      expect.stringContaining('Juan'),
      expect.stringContaining('Maik'),
    ]);
    expect(html().querySelector('.cs-badge')?.textContent).toContain('Tuyo');
    expect(html().querySelector('.cs-card img')).not.toBeNull();
    // Cada tarjeta muestra edad, altura, dueño y ubicación
    expect(tarjetas()[0].textContent).toContain('4 años · 1.3 m');
    expect(tarjetas()[0].textContent).toContain('de David · Cali');
    // La barra está arriba de las tarjetas y aún no permite confirmar
    expect(html().querySelector('.cs-barra')?.textContent).toContain('Selecciona un caballo');
    expect(boton('Confirmar caballo')).toBeUndefined();
    expect(html().querySelector('.cs-check')).toBeNull();
  });

  it('should calculate the age in completed years', () => {
    const hoy = new Date(2026, 10, 2); // 2 nov 2026
    expect(edadEnAnios('2022-01-06', hoy)).toBe(4);
    expect(edadEnAnios('2022-11-03', hoy)).toBe(3); // aún no cumple
    expect(edadEnAnios('2022-11-02', hoy)).toBe(4); // cumple hoy
    expect(edadEnAnios('2027-01-01', hoy)).toBe(0); // fecha futura
    expect(edadEnAnios('no-es-fecha', hoy)).toBe(0);
    expect(edadEnAnios('2020-01-01')).toBeGreaterThan(5);
  });

  it('should hide the counter if it cannot be loaded', async () => {
    compatibilidad.obtenerCupo.mockReturnValue(throwError(() => new Error('500')));
    await crear();
    expect(component.cupo()).toBeNull();
  });

  it('should say when there are no stallions', async () => {
    await crear();
    fixture.componentRef.setInput('caballos', []);
    fixture.detectChanges();
    expect(html().querySelector('.cs-vacio')?.textContent).toContain('No hay caballos');
  });

  it('should go through the three steps and open the results page', async () => {
    await crear();

    clic(tarjetas()[0]);
    expect(tarjetas()[0].classList).toContain('seleccionada');
    expect(tarjetas()[0].getAttribute('aria-pressed')).toBe('true');
    expect(tarjetas()[0].querySelector('.cs-check')?.textContent).toContain('Seleccionado');
    // El nombre sigue visible en la tarjeta seleccionada
    expect(tarjetas()[0].querySelector('h3')?.textContent).toContain('Juan');
    expect(html().querySelector('.cs-barra')?.textContent).toContain('4 años · de David');

    clic(boton('Confirmar caballo'));
    expect(component.paso()).toBe(2);
    expect(html().querySelector('.cs-barra')?.textContent).toContain('Caballo: Juan');
    expect(html().querySelector('.cs-barra')?.textContent).toContain(
      'Selecciona una de tus yeguas',
    );
    expect(component.yeguas()[0].edad).toBeGreaterThanOrEqual(3);
    expect(component.yeguas()[0].altura).toBe(1.3);
    // Solo las yeguas del usuario, con la URL completa de la foto
    expect(component.yeguas().map((y) => y.nombre)).toEqual(['Sara', 'Luna']);
    expect(component.yeguas()[0].fotoPrincipal).toContain('/uploads/sara.png');
    expect(component.yeguas()[1].fotoPrincipal).toBeNull();

    clic(tarjetas()[0]);
    expect(tarjetas()[0].querySelector('.cs-check')?.textContent).toContain('Seleccionada');
    expect(html().querySelector('.cs-barra')?.textContent).toContain('Yegua: Sara');
    clic(boton('Confirmar yegua'));
    expect(component.paso()).toBe(3);
    expect(html().querySelector('.cs-resumen')?.textContent).toContain('Sara');
    expect(
      Array.from(html().querySelectorAll('.cs-factores li')).map((li) => li.textContent?.trim()),
    ).toEqual(component.factoresIa);
    expect(boton('Realizar estudio con IA')?.classList).toContain('cs-boton-ia');

    clic(boton('Realizar estudio'));
    expect(router.navigate).toHaveBeenCalledWith(['/compatibilidad', 10, 8]);
  });

  it('should go back to previous steps and keep the loaded mares', async () => {
    await crear();
    component.seleccionarCaballo(CABALLOS[0]);
    component.confirmarCaballo();
    fixture.detectChanges();

    clic(boton('Cambiar caballo'));
    expect(component.paso()).toBe(1);

    component.confirmarCaballo();
    expect(caballoService.listarMisCaballos).toHaveBeenCalledTimes(1);

    component.seleccionarYegua(component.yeguas()[0]);
    component.confirmarYegua();
    fixture.detectChanges();
    clic(boton('Cambiar yegua'));
    expect(component.paso()).toBe(2);

    // Desde la barra de pasos solo se puede volver atrás
    component.irAPaso(3);
    expect(component.paso()).toBe(2);
    const pasoCaballo = html().querySelector<HTMLButtonElement>('.cs-pasos button');
    clic(pasoCaballo!);
    expect(component.paso()).toBe(1);
  });

  it('should ignore confirmations without a selection', async () => {
    await crear();
    component.confirmarCaballo();
    component.confirmarYegua();
    component.realizarEstudio();
    expect(component.paso()).toBe(1);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should invite to register a mare when the user has none', async () => {
    caballoService.listarMisCaballos.mockReturnValue(of([MIOS[2]]));
    await crear();
    component.seleccionarCaballo(CABALLOS[0]);
    component.confirmarCaballo();
    fixture.detectChanges();

    expect(html().textContent).toContain('No tienes yeguas registradas');
    clic(boton('Registrar yegua'));
    expect(router.navigate).toHaveBeenCalledWith(['/publicaciones/nueva']);
  });

  it('should show loading and allow retrying when mares fail to load', async () => {
    caballoService.listarMisCaballos.mockReturnValue(throwError(() => new Error('500')));
    await crear();
    component.seleccionarCaballo(CABALLOS[0]);
    component.confirmarCaballo();
    fixture.detectChanges();
    expect(html().textContent).toContain('No fue posible cargar tus yeguas');

    component.cargandoYeguas.set(true);
    fixture.detectChanges();
    expect(html().textContent).toContain('Cargando tus yeguas');
    component.cargandoYeguas.set(false);
    fixture.detectChanges();

    caballoService.listarMisCaballos.mockReturnValue(of(MIOS));
    clic(boton('Reintentar'));
    expect(component.errorYeguas()).toBe('');
    expect(component.yeguas().length).toBe(2);
  });
});
