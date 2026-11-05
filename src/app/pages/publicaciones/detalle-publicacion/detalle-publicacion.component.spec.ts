import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DetallePublicacionComponent } from './detalle-publicacion.component';
import { CaballoService, PublicacionDetalle } from '../../../Services/caballo.service';
import { ConversacionService } from '../../../Services/conversacion.service';

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
  let conversaciones: Record<string, ReturnType<typeof vi.fn>>;

  const crear = async (id: string | null = '3') => {
    await TestBed.configureTestingModule({
      imports: [DetallePublicacionComponent],
      providers: [
        provideRouter([]),
        { provide: CaballoService, useValue: caballos },
        { provide: ConversacionService, useValue: conversaciones },
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
    conversaciones = {
      abrir: vi.fn().mockReturnValue(of({ id_conversacion: 12 })),
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

  it('volver should go back to the marketplace', async () => {
    await crear();
    component.volver();
    expect(router.navigate).toHaveBeenCalledWith(['/marketplace']);
  });

  it('the chat button should open the conversation with the seller', async () => {
    await crear();
    const chat = fixture.nativeElement.querySelector('.dp-btn-chat') as HTMLButtonElement;
    expect(chat.disabled).toBe(false);
    expect(chat.textContent).toContain('Chatear con el vendedor');

    chat.click();

    expect(conversaciones['abrir']).toHaveBeenCalledWith(3);
    expect(router.navigate).toHaveBeenCalledWith(['/conversaciones', 12]);
    expect(component.abriendoChat()).toBe(false);
  });

  it('the chat button should not appear on my own publication', async () => {
    caballos['obtenerPublicacion'].mockReturnValue(of(detalle({ es_mia: true })));
    await crear();
    expect(fixture.nativeElement.querySelector('.dp-btn-chat')).toBeNull();
    component.chatearConVendedor();
    expect(conversaciones['abrir']).not.toHaveBeenCalled();
  });

  it('should show an error if the chat cannot be opened', async () => {
    conversaciones['abrir'].mockReturnValue(throwError(() => new Error('500')));
    await crear();
    component.chatearConVendedor();
    fixture.detectChanges();
    expect(component.errorChat()).toBe('No se pudo abrir el chat. Intenta de nuevo.');
    expect(fixture.nativeElement.querySelector('.dp-chat-error').textContent).toContain(
      'No se pudo abrir el chat',
    );
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should ignore a second click while the chat is opening', async () => {
    await crear();
    component.abriendoChat.set(true);
    component.chatearConVendedor();
    expect(conversaciones['abrir']).not.toHaveBeenCalled();
  });
});
