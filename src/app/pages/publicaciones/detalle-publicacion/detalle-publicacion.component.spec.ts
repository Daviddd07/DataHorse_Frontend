import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DetallePublicacionComponent } from './detalle-publicacion.component';
import { CaballoService, PublicacionDetalle } from '../../../Services/caballo.service';

const haceTiempo = (anios: number, meses: number) => {
  const d = new Date();
  d.setDate(1);
  d.setFullYear(d.getFullYear() - anios);
  d.setMonth(d.getMonth() - meses);
  return d.toISOString();
};

const detalle = (p: Partial<PublicacionDetalle> = {}): PublicacionDetalle => ({
  id_publicacion: 3,
  id_caballo: 7,
  id_usuario: 1,
  titulo: 'Rayo',
  descripcion: 'Manso',
  fecha_publicacion: '2026-01-01',
  estado: 'Activa',
  nombre: 'Rayo',
  sexo: 'Macho',
  fecha_nacimiento: haceTiempo(3, 2),
  altura: 1.5,
  color: 'Negro',
  ubicacion: 'Bogotá',
  disponibilidad: 'Disponible',
  id_raza: 1,
  raza: 'Criollo',
  raza_descripcion: 'Raza colombiana',
  propietario: 'Ana',
  propietario_ubicacion: 'Bogotá',
  propietario_telefono: '3001234567',
  precio: 1000,
  es_mia: false,
  es_favorita: false,
  fotos: [
    { id_foto: 1, ruta: '/uploads/a.png', es_principal: false, orden: 0 },
    { id_foto: 2, ruta: '/uploads/b.png', es_principal: true, orden: 1 },
    { id_foto: 3, ruta: '/uploads/c.png', es_principal: false, orden: 2 },
  ],
  ...p,
});

describe('DetallePublicacionComponent', () => {
  let fixture: ComponentFixture<DetallePublicacionComponent>;
  let component: DetallePublicacionComponent;
  let router: Router;
  let caballos: Record<string, ReturnType<typeof vi.fn>>;

  const crear = async (id: string | null = '3') => {
    await TestBed.configureTestingModule({
      imports: [DetallePublicacionComponent],
      providers: [
        provideRouter([]),
        { provide: CaballoService, useValue: caballos },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } },
        },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(DetallePublicacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    caballos = {
      obtenerPublicacion: vi.fn().mockReturnValue(of(detalle())),
      agregarFavorito: vi.fn().mockReturnValue(of({})),
      quitarFavorito: vi.fn().mockReturnValue(of({})),
    };
  });

  it('should load the publication and select the main photo', async () => {
    await crear();
    expect(caballos['obtenerPublicacion']).toHaveBeenCalledWith(3);
    expect(component.publicacion()?.nombre).toBe('Rayo');
    expect(component.fotoActiva()).toBe(1);
    expect(component.cargando()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Rayo');
  });

  it('should default to the first photo without a main one', async () => {
    caballos['obtenerPublicacion'].mockReturnValue(
      of(detalle({ fotos: [{ id_foto: 1, ruta: '/a.png', es_principal: false, orden: 0 }] })),
    );
    await crear();
    expect(component.fotoActiva()).toBe(0);
  });

  it('should reject an invalid id', async () => {
    await crear(null);
    expect(component.error()).toBe('Publicación no válida.');
    expect(component.cargando()).toBe(false);
    expect(caballos['obtenerPublicacion']).not.toHaveBeenCalled();
    expect(component.edad()).toBe('');
  });

  it('should handle loading errors', async () => {
    caballos['obtenerPublicacion'].mockReturnValue(throwError(() => new Error('x')));
    await crear();
    expect(component.error()).toBe('No se pudo cargar la publicación.');
    expect(component.cargando()).toBe(false);
  });

  describe('edad', () => {
    beforeEach(() => crear());

    it.each([
      [3, 2, '3 años, 2 meses'],
      [1, 1, '1 año, 1 mes'],
      [2, 0, '2 años'],
      [0, 5, '5 meses'],
      [0, 1, '1 mes'],
      [2, -1, '1 año, 11 meses'],
    ])('%i years and %i months -> "%s"', (anios, meses, esperado) => {
      component.publicacion.set(detalle({ fecha_nacimiento: haceTiempo(anios, meses) }));
      expect(component.edad()).toBe(esperado);
    });
  });

  describe('gallery', () => {
    beforeEach(() => crear());

    it('should change, go back and go forward cyclically', () => {
      component.cambiarFoto(0);
      component.anteriorFoto();
      expect(component.fotoActiva()).toBe(2);
      component.anteriorFoto();
      expect(component.fotoActiva()).toBe(1);
      component.siguienteFoto();
      component.siguienteFoto();
      expect(component.fotoActiva()).toBe(0);
      component.siguienteFoto();
      expect(component.fotoActiva()).toBe(1);
      fixture.detectChanges();
    });

    it('should ignore navigation without photos or publication', () => {
      component.publicacion.set(detalle({ fotos: [] }));
      component.fotoActiva.set(0);
      component.anteriorFoto();
      component.siguienteFoto();
      expect(component.fotoActiva()).toBe(0);

      component.publicacion.set(null);
      component.anteriorFoto();
      component.siguienteFoto();
      expect(component.fotoActiva()).toBe(0);
    });
  });

  describe('favorites', () => {
    beforeEach(() => crear());

    it('should add and remove the favorite', () => {
      component.toggleFavorito();
      expect(caballos['agregarFavorito']).toHaveBeenCalledWith(7);
      expect(component.publicacion()?.es_favorita).toBe(true);

      component.toggleFavorito();
      expect(caballos['quitarFavorito']).toHaveBeenCalledWith(7);
      expect(component.publicacion()?.es_favorita).toBe(false);
    });

    it('should keep the state on errors', () => {
      caballos['agregarFavorito'].mockReturnValue(throwError(() => new Error('x')));
      component.toggleFavorito();
      expect(component.publicacion()?.es_favorita).toBe(false);
    });

    it('should do nothing without a publication', () => {
      component.publicacion.set(null);
      component.toggleFavorito();
      expect(caballos['agregarFavorito']).not.toHaveBeenCalled();
    });
  });

  it('volver and chatearConVendedor', async () => {
    await crear();
    component.volver();
    expect(router.navigate).toHaveBeenCalledWith(['/marketplace']);
    component.chatearConVendedor();
    expect(console.log).toHaveBeenCalled();
  });
});
