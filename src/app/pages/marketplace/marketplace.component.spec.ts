import { Provider, signal } from '@angular/core';
import { NotificacionesService } from '../../Services/notificaciones.service';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { MarketplaceComponent } from './marketplace.component';
import { AuthService } from '../../Services/auth.service';
import { CaballoService, Publicacion } from '../../Services/caballo.service';
import { LogService } from '../../Services/log.service';
import { CompatibilidadService } from '../../Services/compatibilidad.service';

const logMock = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), flush: vi.fn() };

const haceAnios = (anios: number, meses = 0) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - anios);
  d.setMonth(d.getMonth() - meses);
  return d.toISOString().split('T')[0];
};

const publicacion = (p: Partial<Publicacion>): Publicacion =>
  ({
    id_publicacion: 1,
    id_caballo: 10,
    id_usuario: 1,
    titulo: 'Rayo',
    nombre: 'Rayo',
    raza: 'Criollo',
    sexo: 'Macho',
    ubicacion: 'Bogotá',
    color: 'Negro',
    descripcion: 'Buen caballo',
    disponibilidad: 'Disponible',
    fecha_publicacion: '2026-01-01',
    fecha_nacimiento: haceAnios(5),
    altura: 1.5,
    precio: 1_000_000,
    propietario: 'Ana',
    es_mia: false,
    es_favorita: false,
    foto_principal: null,
    ...p,
  }) as Publicacion;

const PUBLICACIONES: Publicacion[] = [
  publicacion({
    id_publicacion: 1,
    id_caballo: 10,
    nombre: 'Rayo',
    fecha_nacimiento: haceAnios(5),
    altura: 1.5,
    foto_principal: '/uploads/rayo.png',
    ubicacion_lat: 4.6,
    ubicacion_lng: -74.08,
  }),
  publicacion({
    id_publicacion: 2,
    id_caballo: 20,
    nombre: 'Luna',
    raza: 'Árabe',
    sexo: 'Hembra',
    ubicacion: 'Medellín',
    fecha_nacimiento: haceAnios(2),
    altura: 1.7,
    precio: null,
    es_favorita: true,
    disponibilidad: 'No disponible',
    ubicacion_lat: 6.24,
    ubicacion_lng: -75.58,
  }),
  publicacion({
    id_publicacion: 3,
    id_caballo: 30,
    nombre: 'Trueno',
    raza: 'Percherón',
    fecha_nacimiento: haceAnios(10),
    altura: 1.6,
    precio: 50_000_000,
  }),
  publicacion({
    id_publicacion: 4,
    id_caballo: 40,
    nombre: 'Sin fecha',
    fecha_nacimiento: '',
    altura: 1.4,
    ubicacion_lat: 4.61,
    ubicacion_lng: -74.07,
  }),
];

describe('MarketplaceComponent', () => {
  let fixture: ComponentFixture<MarketplaceComponent>;
  let component: MarketplaceComponent;
  let router: Router;
  let auth: Record<string, ReturnType<typeof vi.fn>>;
  let caballos: Record<string, ReturnType<typeof vi.fn>>;
  const compatibilidadMock = {
    obtenerCupo: vi.fn().mockReturnValue(of({ limite: 5, usadas: 1, restantes: 4 })),
  };

  const notificaciones = { noLeidos: signal(0) };

  const crear = async (extraProviders: Provider[] = []) => {
    notificaciones.noLeidos.set(0);
    await TestBed.configureTestingModule({
      imports: [MarketplaceComponent],
      providers: [
        provideRouter([]),
        { provide: NotificacionesService, useValue: notificaciones },
        { provide: LogService, useValue: logMock },
        { provide: AuthService, useValue: auth },
        { provide: CaballoService, useValue: caballos },
        { provide: CompatibilidadService, useValue: compatibilidadMock },
        ...extraProviders,
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(MarketplaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const nombres = () => component.publicacionesFiltradas().map((c) => c.nombre);

  // Botón de la barra lateral por su nombre (la píldora que aparece al pasar el mouse)
  const botonLateral = (nombre: string) =>
    (
      Array.from(
        fixture.nativeElement.querySelectorAll('.sidebar .icon-btn'),
      ) as HTMLButtonElement[]
    ).find((b) => b.getAttribute('aria-label') === nombre);

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    auth = {
      me: vi.fn().mockReturnValue(of({ id: 1, correo: 'ana@correo.com', nombre: ' ana maría ' })),
      logout: vi.fn().mockReturnValue(of({})),
    };
    caballos = {
      listarRazas: vi.fn().mockReturnValue(
        of([
          { id_raza: 2, nombre: 'Percherón' },
          { id_raza: 1, nombre: 'Árabe' },
          { id_raza: 3, nombre: 'Criollo' },
        ]),
      ),
      listarPublicaciones: vi.fn().mockReturnValue(of(PUBLICACIONES)),
      listarMisCaballos: vi.fn().mockReturnValue(of([{ id_caballo: 1 }, { id_caballo: 2 }])),
      agregarFavorito: vi.fn().mockReturnValue(of({})),
      quitarFavorito: vi.fn().mockReturnValue(of({})),
    };
  });

  describe('loading', () => {
    beforeEach(() => crear());

    it('should load user, breeds and publications', () => {
      expect(component.nombreUsuario()).toBe('ana');
      expect(component.inicial()).toBe('A');
      expect(component.correoUsuario()).toBe('ana@correo.com');
      expect(component.razas()).toEqual(['Árabe', 'Criollo', 'Percherón']);
      expect(component.caballos().length).toBe(4);
      expect(component.cargando()).toBe(false);
    });

    it('should map publications to marketplace cards', () => {
      const [rayo, luna, , sinFecha] = component.caballos();
      expect(rayo.fotoPrincipal).toContain('/uploads/rayo.png');
      expect(rayo.edad).toBe(5);
      expect(rayo.fondo).toContain('#ddd8ff');
      expect(luna.fondo).toContain('#f7d9ee');
      expect(luna.fotoPrincipal).toBeNull();
      expect(sinFecha.edad).toBe(0);
      expect(component.caballos()[2].lat).toBeNull();
    });

    it('should split the featured horse from the rest', () => {
      expect(component.destacado()?.nombre).toBe('Rayo');
      expect(component.caballosFiltrados().map((c) => c.nombre)).not.toContain('Rayo');
      expect(fixture.nativeElement.textContent).toContain('Rayo');
    });
  });

  describe('skeletons', () => {
    const html = () => fixture.nativeElement as HTMLElement;

    it('should show skeleton cards and avatar while loading', async () => {
      auth['me'].mockReturnValue(NEVER);
      caballos['listarPublicaciones'].mockReturnValue(NEVER);
      await crear();
      expect(html().querySelectorAll('.card-esqueleto').length).toBe(component.esqueletos.length);
      expect(html().querySelector('.grid-cards')?.getAttribute('aria-busy')).toBe('true');
      expect(html().querySelector('[role="status"]')?.getAttribute('aria-label')).toBe(
        'Cargando ejemplares',
      );
      expect(html().querySelector('.avatar-esqueleto')).not.toBeNull();
      expect(html().textContent).not.toContain('No hay coincidencias');
    });

    it('should replace the skeletons with the real cards', async () => {
      await crear();
      expect(html().querySelector('.card-esqueleto')).toBeNull();
      expect(html().querySelector('.avatar-esqueleto')).toBeNull();
      expect(html().querySelectorAll('.grid-cards .card').length).toBe(4);
    });

    it('should recreate the cards (to animate them) only when the tab changes', async () => {
      await crear();
      const tarjeta = (nombre: string) =>
        Array.from(html().querySelectorAll('.grid-cards .card')).find((c) =>
          c.textContent?.includes(nombre),
        );

      component.seleccionarCategoria('Edad');
      fixture.detectChanges();
      const enEdad = tarjeta('Rayo');
      expect(enEdad).toBeDefined();

      // Volver a hacer clic invierte el orden: la tarjeta se mueve, no se vuelve a crear
      component.seleccionarCategoria('Edad');
      fixture.detectChanges();
      expect(tarjeta('Rayo')).toBe(enEdad);

      component.seleccionarCategoria('Altura');
      fixture.detectChanges();
      expect(tarjeta('Rayo')).not.toBe(enEdad);
    });

    it('should keep the same card when toggling a favorite', async () => {
      await crear();
      const antes = html().querySelector('.grid-cards .card');
      component.toggleFavorito(component.caballos()[0]);
      fixture.detectChanges();
      expect(html().querySelector('.grid-cards .card')).toBe(antes);
    });
  });

  it('should not count a birthday that has not happened yet this year', async () => {
    const fecha = new Date();
    fecha.setFullYear(fecha.getFullYear() - 5);
    fecha.setMonth(fecha.getMonth() + 1);
    caballos['listarPublicaciones'].mockReturnValue(
      of([publicacion({ fecha_nacimiento: fecha.toISOString().split('T')[0] })]),
    );
    await crear();
    expect(component.caballos()[0].edad).toBe(4);
  });

  describe('my horses counter', () => {
    const badge = () => fixture.nativeElement.querySelector('.user-menu .menu-badge');

    it('should show the real number of my horses in the user menu', async () => {
      await crear();
      component.menuAbierto.set(true);
      fixture.detectChanges();
      expect(component.totalMisCaballos()).toBe(2);
      expect(badge()?.textContent?.trim()).toBe('2');
    });

    it('should hide the counter when there are none or it fails', async () => {
      caballos['listarMisCaballos'].mockReturnValue(throwError(() => new Error('500')));
      await crear();
      component.menuAbierto.set(true);
      fixture.detectChanges();
      expect(component.totalMisCaballos()).toBe(0);
      expect(badge()).toBeNull();
    });
  });

  describe('loading errors', () => {
    it('should show the error with a retry instead of "no matches"', async () => {
      caballos['listarPublicaciones'].mockReturnValueOnce(throwError(() => new Error('500')));
      await crear();
      const html = fixture.nativeElement as HTMLElement;

      expect(html.querySelector('.estado-error')?.textContent).toContain(
        'No se pudieron cargar las publicaciones.',
      );
      expect(html.textContent).not.toContain('No hay coincidencias');

      (html.querySelector('.btn-reintentar') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(caballos['listarPublicaciones']).toHaveBeenCalledTimes(2);
      expect(html.querySelector('.estado-error')).toBeNull();
      expect(component.caballos().length).toBe(4);
    });

    it('should handle failures from every service', async () => {
      auth['me'].mockReturnValue(throwError(() => new Error('401')));
      caballos['listarRazas'].mockReturnValue(throwError(() => new Error('500')));
      caballos['listarPublicaciones'].mockReturnValue(throwError(() => new Error('500')));
      await crear();
      expect(component.nombreUsuario()).toBe('');
      expect(component.inicial()).toBe('?');
      expect(component.razas()).toEqual([]);
      expect(component.caballos()).toEqual([]);
      expect(component.error()).toBe('No se pudieron cargar las publicaciones.');
      expect(component.cargando()).toBe(false);
      expect(component.destacado()).toBeUndefined();
    });
  });

  describe('filters', () => {
    beforeEach(() => crear());

    it('should filter by text in name, breed or location', () => {
      component.busqueda.set('luna');
      expect(nombres()).toEqual(['Luna']);
      component.busqueda.set('percher');
      expect(nombres()).toEqual(['Trueno']);
      component.busqueda.set('medellín');
      expect(nombres()).toEqual(['Luna']);
    });

    it('should filter by selected breeds', () => {
      component.toggleRaza('Árabe');
      expect(nombres()).toEqual(['Luna']);
      component.toggleRaza('Árabe');
      expect(nombres().length).toBe(4);
    });

    it('should filter by verified, max price and max age', () => {
      component.soloVerificados.set(true);
      expect(nombres()).toEqual([]);
      component.soloVerificados.set(false);

      // En el tope del slider no se limita: aparecen también los de más de 6M
      expect(component.precioMax()).toBe(component.PRECIO_MAX_SLIDER);
      expect(nombres()).toContain('Trueno');

      component.precioMax.set(4_000_000);
      expect(nombres()).not.toContain('Trueno');
      expect(nombres()).toContain('Luna');

      component.edadMax.set(3);
      expect(nombres()).toEqual(['Luna', 'Sin fecha']);
    });

    it('should filter by Favoritos and Pedigrí', () => {
      component.categoriaActiva.set('Favoritos');
      expect(nombres()).toEqual(['Luna']);
      component.categoriaActiva.set('Pedigrí');
      expect(nombres()).toEqual([]);
    });

    it('Proximidad should show everything without user location', () => {
      component.seleccionarCategoria('Proximidad');
      expect(nombres().length).toBe(4);
    });

    it('Proximidad should filter by radius and sort by distance', () => {
      component.seleccionarCategoria('Proximidad');
      component.userLat.set(4.6);
      component.userLng.set(-74.08);
      expect(nombres()).toEqual(['Rayo', 'Sin fecha']);

      component.radioMax.set(500);
      expect(nombres()).toEqual(['Rayo', 'Sin fecha', 'Luna']);
    });

    it('Altura should sort and toggle direction', () => {
      component.seleccionarCategoria('Altura');
      expect(nombres()).toEqual(['Luna', 'Trueno', 'Rayo', 'Sin fecha']);
      component.seleccionarCategoria('Altura');
      expect(component.alturaAscendente()).toBe(true);
      expect(nombres()).toEqual(['Sin fecha', 'Rayo', 'Trueno', 'Luna']);
    });

    it('Edad should sort and toggle direction', () => {
      component.seleccionarCategoria('Edad');
      expect(nombres()).toEqual(['Sin fecha', 'Luna', 'Rayo', 'Trueno']);
      component.seleccionarCategoria('Edad');
      expect(component.edadAscendente()).toBe(false);
      expect(nombres()).toEqual(['Trueno', 'Rayo', 'Luna', 'Sin fecha']);
    });

    it('changing category should reset the sort directions', () => {
      component.alturaAscendente.set(true);
      component.edadAscendente.set(false);
      component.seleccionarCategoria('Todos');
      expect(component.alturaAscendente()).toBe(false);
      expect(component.edadAscendente()).toBe(true);
      expect(component.categoriaActiva()).toBe('Todos');
    });

    it('should render every category without errors', () => {
      component.toggleFiltros();
      for (const cat of [...component.categorias, 'Favoritos']) {
        component.seleccionarCategoria(cat);
        fixture.detectChanges();
      }
      expect(component.filtrosAbiertos()).toBe(true);
      component.toggleFiltros();
      expect(component.filtrosAbiertos()).toBe(false);
    });
  });

  describe('compatibility tab', () => {
    const selector = () => fixture.nativeElement.querySelector('app-compatibilidad-selector');

    it('should mark the compatibility tab as an AI feature', async () => {
      await crear();
      const pestanas = Array.from(
        fixture.nativeElement.querySelectorAll('.nav-link'),
      ) as HTMLElement[];
      const ia = pestanas.filter((p) => p.classList.contains('nav-ia'));

      expect(ia.length).toBe(1);
      expect(ia[0].textContent).toContain('Compatibilidad');
      expect(ia[0].querySelector('.nav-badge-ia')?.textContent).toBe('IA');
      expect(ia[0].querySelector('app-logo-ia')?.classList).not.toContain('pensando');

      component.seleccionarCategoria('Compatibilidad');
      fixture.detectChanges();
      expect(ia[0].querySelector('app-logo-ia')?.classList).toContain('pensando');
    });

    it('should replace the cards with the compatibility wizard', async () => {
      await crear();
      expect(selector()).toBeNull();

      component.seleccionarCategoria('Compatibilidad');
      fixture.detectChanges();

      expect(selector()).not.toBeNull();
      expect(fixture.nativeElement.querySelector('.grid-cards')).toBeNull();
    });

    it('should open the tab from the query string', async () => {
      await crear([
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: convertToParamMap({ categoria: 'Compatibilidad' }) },
          },
        },
      ]);
      expect(component.categoriaActiva()).toBe('Compatibilidad');
    });

    it('should ignore an unknown category in the query string', async () => {
      await crear([
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ categoria: 'Hackeo' }) } },
        },
      ]);
      expect(component.categoriaActiva()).toBe('Todos');
    });
  });

  describe('favorites', () => {
    beforeEach(() => crear());

    it('should add a favorite', () => {
      const rayo = component.caballos()[0];
      component.toggleFavorito(rayo);
      expect(caballos['agregarFavorito']).toHaveBeenCalledWith(10);
      expect(component.caballos()[0].esFavorito).toBe(true);
    });

    it('should remove a favorite', () => {
      const luna = component.caballos()[1];
      component.toggleFavorito(luna);
      expect(caballos['quitarFavorito']).toHaveBeenCalledWith(20);
      expect(component.caballos()[1].esFavorito).toBe(false);
    });

    it('should keep the state on errors', () => {
      caballos['agregarFavorito'].mockReturnValue(throwError(() => new Error('x')));
      caballos['quitarFavorito'].mockReturnValue(throwError(() => new Error('x')));
      component.toggleFavorito(component.caballos()[0]);
      component.toggleFavorito(component.caballos()[1]);
      expect(component.caballos()[0].esFavorito).toBe(false);
      expect(component.caballos()[1].esFavorito).toBe(true);
    });
  });

  describe('navigation and menu', () => {
    beforeEach(() => crear());

    it('should navigate to the right pages', () => {
      component.agregarPublicacion();
      expect(router.navigate).toHaveBeenCalledWith(['/publicaciones/nueva']);
      component.irADetalle(component.caballos()[0]);
      expect(router.navigate).toHaveBeenCalledWith(['/publicaciones', 1]);
    });

    it('should toggle and close the menu', () => {
      component.toggleMenu();
      fixture.detectChanges();
      expect(component.menuAbierto()).toBe(true);
      component.cerrarMenu();
      expect(component.menuAbierto()).toBe(false);
      component.toggleMenu();
      component.irAMisCaballos();
      expect(component.menuAbierto()).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/mis-caballos']);
    });

    it('should log out even if the backend fails', () => {
      component.cerrarSesion();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);

      vi.mocked(router.navigate).mockClear();
      auth['logout'].mockReturnValue(throwError(() => new Error('x')));
      component.menuAbierto.set(true);
      component.cerrarSesion();
      expect(component.menuAbierto()).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should show the user initial at the bottom and open the account menu', () => {
      const avatar = botonLateral('Mi cuenta') as HTMLButtonElement;
      expect(avatar.querySelector('.avatar-inicial')?.textContent?.trim()).toBe('A');
      avatar.click();
      fixture.detectChanges();
      expect(component.menuAbierto()).toBe(true);
      expect(avatar.getAttribute('aria-expanded')).toBe('true');
    });

    it('should mark the options that do not exist yet as "Próximamente"', () => {
      component.menuAbierto.set(true);
      fixture.detectChanges();
      const pronto = Array.from(
        fixture.nativeElement.querySelectorAll('.user-menu-list button.menu-pronto'),
      ) as HTMLButtonElement[];
      expect(pronto.map((b) => b.textContent?.replace('Próximamente', '').trim())).toEqual([
        'Mi cuenta',
        'Pedigrí y documentos',
        'Configuración',
      ]);
      expect(pronto.every((b) => b.disabled && b.textContent?.includes('Próximamente'))).toBe(true);
    });

    it('should open the messages from the sidebar and from the account menu', () => {
      botonLateral('Mensajes')?.click();
      expect(router.navigate).toHaveBeenCalledWith(['/conversaciones']);

      component.menuAbierto.set(true);
      fixture.detectChanges();
      const opcion = (
        Array.from(fixture.nativeElement.querySelectorAll('.user-menu-list button')) as HTMLButtonElement[]
      ).find((b) => b.textContent?.includes('Mensajes'));
      expect(opcion?.disabled).toBe(false);
      opcion?.click();
      expect(component.menuAbierto()).toBe(false);
      expect(router.navigate).toHaveBeenCalledTimes(2);
    });

    it('should show how many messages are unread', () => {
      expect(fixture.nativeElement.querySelector('.dock-badge')).toBeNull();

      notificaciones.noLeidos.set(3);
      component.menuAbierto.set(true);
      fixture.detectChanges();

      expect(botonLateral('Mensajes (3 sin leer)')?.querySelector('.dock-badge')?.textContent).toBe('3');
      const opcion = (
        Array.from(fixture.nativeElement.querySelectorAll('.user-menu-list button')) as HTMLButtonElement[]
      ).find((b) => b.textContent?.includes('Mensajes'));
      expect(opcion?.querySelector('.menu-badge')?.textContent).toBe('3');

      notificaciones.noLeidos.set(150);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.dock-badge').textContent).toBe('99+');
    });

    it('should show the Pedigrí tab as coming soon and not selectable', () => {
      const pestana = (
        Array.from(fixture.nativeElement.querySelectorAll('.nav-link')) as HTMLButtonElement[]
      ).find((b) => b.textContent?.includes('Pedigrí'));
      expect(pestana?.disabled).toBe(true);
      expect(pestana?.querySelector('.pronto')?.textContent).toBe('Pronto');
    });

    it('should hide the admin button from a normal user', () => {
      expect(component.esAdmin()).toBe(false);
      expect(botonLateral('Panel de administración')).toBeUndefined();
    });

    it('should open "Mis resultados" from the sidebar', () => {
      const boton = botonLateral('Mis resultados') as HTMLButtonElement;
      component.menuAbierto.set(true);
      boton.click();
      expect(component.menuAbierto()).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/compatibilidad/mis-resultados']);
    });
  });

  describe('administrator', () => {
    beforeEach(async () => {
      auth['me'].mockReturnValue(
        of({ id: 1, correo: 'admin@correo.com', nombre: 'Admin', es_admin: true }),
      );
      await crear();
    });

    it('should show the admin button and open the panel', () => {
      expect(component.esAdmin()).toBe(true);
      const boton = botonLateral('Panel de administración') as HTMLButtonElement;
      component.menuAbierto.set(true);
      boton.click();
      expect(component.menuAbierto()).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/admin']);
    });
  });

  describe('geolocation', () => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'geolocation');

    const definir = (valor: unknown) =>
      Object.defineProperty(navigator, 'geolocation', { value: valor, configurable: true });

    beforeEach(() => crear());

    afterEach(() => {
      if (original) Object.defineProperty(navigator, 'geolocation', original);
      else delete (navigator as unknown as Record<string, unknown>)['geolocation'];
    });

    it('should report unsupported browsers', () => {
      definir(undefined);
      component.pedirUbicacion();
      expect(component.errorUbicacion()).toBe('Tu navegador no soporta geolocalización.');
    });

    it('should store the user position', () => {
      definir({
        getCurrentPosition: (ok: PositionCallback) =>
          ok({ coords: { latitude: 4.6, longitude: -74.08 } } as GeolocationPosition),
      });
      component.pedirUbicacion();
      expect(component.userLat()).toBe(4.6);
      expect(component.userLng()).toBe(-74.08);
      expect(component.cargandoUbicacion()).toBe(false);
    });

    it('should report a denied permission', () => {
      definir({
        getCurrentPosition: (_ok: PositionCallback, fallo: PositionErrorCallback) =>
          fallo({ code: 1 } as GeolocationPositionError),
      });
      component.pedirUbicacion();
      expect(component.errorUbicacion()).toBe('Permiso denegado o no disponible.');
      expect(component.cargandoUbicacion()).toBe(false);
    });
  });

  it('calcularDistancia should use the Haversine formula', async () => {
    await crear();
    expect(component.calcularDistancia(0, 0, 0, 0)).toBe(0);
    const bogotaMedellin = component.calcularDistancia(4.711, -74.0721, 6.2442, -75.5812);
    expect(bogotaMedellin).toBeGreaterThan(230);
    expect(bogotaMedellin).toBeLessThan(250);
  });
});
