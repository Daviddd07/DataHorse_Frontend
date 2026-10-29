import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MisCaballosComponent } from './mis-caballos.component';
import { AuthService } from '../../Services/auth.service';
import { CaballoMio, CaballoService } from '../../Services/caballo.service';

const caballo = (c: Partial<CaballoMio>): CaballoMio => ({
  id_caballo: 1,
  nombre: 'Rayo',
  sexo: 'Macho',
  fecha_nacimiento: '2020-01-01',
  altura: 1.5,
  color: 'Negro',
  ubicacion: 'Bogotá',
  descripcion: 'Manso',
  disponibilidad: 'Disponible',
  id_raza: 1,
  raza: 'Criollo',
  foto_principal: '/uploads/rayo.png',
  id_publicacion: 3,
  precio: 1000,
  publicado: true,
  ...c,
});

describe('MisCaballosComponent', () => {
  let fixture: ComponentFixture<MisCaballosComponent>;
  let component: MisCaballosComponent;
  let router: Router;
  let auth: Record<string, ReturnType<typeof vi.fn>>;
  let caballos: Record<string, ReturnType<typeof vi.fn>>;

  const crear = async () => {
    await TestBed.configureTestingModule({
      imports: [MisCaballosComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: CaballoService, useValue: caballos },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(MisCaballosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    auth = {
      me: vi.fn().mockReturnValue(of({ id: 1, correo: 'ana@correo.com', nombre: 'Ana López' })),
      logout: vi.fn().mockReturnValue(of({})),
    };
    caballos = {
      listarMisCaballos: vi.fn().mockReturnValue(
        of([
          caballo({ id_caballo: 1 }),
          caballo({
            id_caballo: 2,
            nombre: 'Luna',
            sexo: 'Hembra',
            foto_principal: null,
            precio: null,
            publicado: false,
            id_publicacion: null,
          }),
        ]),
      ),
      eliminarCaballo: vi.fn().mockReturnValue(of({})),
    };
  });

  it('should load the user and split horses by sex', async () => {
    await crear();
    expect(component.nombreUsuario()).toBe('Ana');
    expect(component.inicial()).toBe('A');
    expect(component.correoUsuario()).toBe('ana@correo.com');
    expect(component.machos().map((c) => c.nombre)).toEqual(['Rayo']);
    expect(component.hembras().map((c) => c.nombre)).toEqual(['Luna']);
    expect(component.caballos()[0].fotoUrl).toContain('/uploads/rayo.png');
    expect(component.caballos()[1].fotoUrl).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Rayo');
  });

  it('should handle loading errors', async () => {
    auth['me'].mockReturnValue(throwError(() => new Error('x')));
    caballos['listarMisCaballos'].mockReturnValue(throwError(() => new Error('x')));
    await crear();
    expect(component.nombreUsuario()).toBe('');
    expect(component.inicial()).toBe('?');
    expect(component.error()).toBe('No se pudieron cargar tus caballos.');
    expect(component.cargando()).toBe(false);
  });

  it('should render an empty list', async () => {
    caballos['listarMisCaballos'].mockReturnValue(of([]));
    await crear();
    expect(component.caballos()).toEqual([]);
  });

  describe('actions', () => {
    beforeEach(() => crear());

    it('should navigate to other pages', () => {
      component.volverAlMarketplace();
      expect(router.navigate).toHaveBeenCalledWith(['/marketplace']);
      component.publicarCaballo();
      expect(router.navigate).toHaveBeenCalledWith(['/publicaciones/nueva']);
      component.editarCaballo(component.caballos()[0]);
      expect(router.navigate).toHaveBeenCalledWith(['/mis-caballos/editar', 1]);
    });

    it('should open and cancel the delete modal', () => {
      component.eliminarCaballo(component.caballos()[0]);
      fixture.detectChanges();
      expect(component.modalEliminarAbierto()).toBe(true);
      expect(component.caballoAEliminar()?.id_caballo).toBe(1);
      component.cancelarEliminarCaballo();
      expect(component.modalEliminarAbierto()).toBe(false);
      expect(component.caballoAEliminar()).toBeNull();
    });

    it('should do nothing when confirming without a selection', () => {
      component.confirmarEliminarCaballo();
      expect(caballos['eliminarCaballo']).not.toHaveBeenCalled();
    });

    it('should delete the horse from the list', () => {
      component.eliminarCaballo(component.caballos()[0]);
      component.confirmarEliminarCaballo();
      expect(caballos['eliminarCaballo']).toHaveBeenCalledWith(1);
      expect(component.caballos().map((c) => c.id_caballo)).toEqual([2]);
      expect(component.modalEliminarAbierto()).toBe(false);
    });

    it('should report delete errors', () => {
      caballos['eliminarCaballo'].mockReturnValue(throwError(() => new Error('x')));
      component.eliminarCaballo(component.caballos()[0]);
      component.confirmarEliminarCaballo();
      expect(component.error()).toBe('No se pudo eliminar el caballo. Intenta de nuevo.');
      expect(component.caballos().length).toBe(2);
      expect(component.caballoAEliminar()).toBeNull();
    });

    it('should manage the menu', () => {
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

    it('should log out on success and on error', () => {
      component.cerrarSesion();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
      vi.mocked(router.navigate).mockClear();
      auth['logout'].mockReturnValue(throwError(() => new Error('x')));
      component.cerrarSesion();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    });
  });
});
