import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MarketplaceComponent } from './marketplace.component';
import { AuthService } from '../../Services/auth.service';
import { CaballoService, Publicacion } from '../../Services/caballo.service';

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

  const crear = async () => {
    await TestBed.configureTestingModule({
      imports: [MarketplaceComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: CaballoService, useValue: caballos },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(MarketplaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const nombres = () => component.publicacionesFiltradas().map((c) => c.nombre);

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

  describe('loading errors', () => {
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

      component.precioMax.set(40_000_000);
      expect(nombres()).not.toContain('Trueno');
      expect(nombres()).toContain('Luna');

      component.edadMax.set(3);
      expect(nombres()).toEqual(['Luna', 'Sin fecha']);
    });

    it('should filter by Favoritos, En venta and Pedigrí', () => {
      component.categoriaActiva.set('Favoritos');
      expect(nombres()).toEqual(['Luna']);
      component.categoriaActiva.set('En venta');
      expect(nombres()).not.toContain('Luna');
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
