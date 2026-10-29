import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { EditarCaballoComponent } from './editar-caballo.component';
import { AuthService } from '../../Services/auth.service';
import { CaballoDetalle, CaballoService } from '../../Services/caballo.service';

const CABALLO: CaballoDetalle = {
  id_caballo: 7,
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
  id_publicacion: 3,
  precio: 1000,
  fotos: [
    { id_foto: 1, ruta: '/uploads/a.png', es_principal: true, orden: 0 },
    { id_foto: 2, ruta: '/uploads/b.png', es_principal: false, orden: 1 },
  ],
};

describe('EditarCaballoComponent', () => {
  let fixture: ComponentFixture<EditarCaballoComponent>;
  let component: EditarCaballoComponent;
  let router: Router;
  let auth: Record<string, ReturnType<typeof vi.fn>>;
  let caballos: Record<string, ReturnType<typeof vi.fn>>;

  const crear = async (id: string | null = '7') => {
    await TestBed.configureTestingModule({
      imports: [EditarCaballoComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: CaballoService, useValue: caballos },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } },
        },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(EditarCaballoComponent);
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
      listarRazas: vi.fn().mockReturnValue(of([{ id_raza: 1, nombre: 'Criollo' }])),
      obtenerCaballo: vi.fn().mockReturnValue(of(structuredClone(CABALLO))),
      actualizarCaballo: vi.fn().mockReturnValue(of({ mensaje: 'ok', id_caballo: 7 })),
      subirFotos: vi.fn().mockReturnValue(of([])),
      eliminarFoto: vi.fn().mockReturnValue(of({})),
      eliminarCaballo: vi.fn().mockReturnValue(of({})),
    };
  });

  describe('loading', () => {
    it('should load the user, breeds and horse into the form', async () => {
      await crear();
      expect(component.nombreUsuario()).toBe('Ana');
      expect(component.inicial()).toBe('A');
      expect(component.razas().length).toBe(1);
      expect(component.idCaballo()).toBe(7);
      expect(component.nombre()).toBe('Rayo');
      expect(component.precio()).toBe(1000);
      expect(component.fotos()[0].urlCompleta).toContain('/uploads/a.png');
      expect(component.cargando()).toBe(false);
    });

    it('should reject an invalid id', async () => {
      await crear(null);
      expect(component.error()).toBe('ID de caballo inválido.');
      expect(caballos['obtenerCaballo']).not.toHaveBeenCalled();
    });

    it('should handle loading errors', async () => {
      auth['me'].mockReturnValue(throwError(() => new Error('x')));
      caballos['listarRazas'].mockReturnValue(throwError(() => new Error('x')));
      caballos['obtenerCaballo'].mockReturnValue(throwError(() => new Error('x')));
      await crear();
      expect(component.nombreUsuario()).toBe('');
      expect(component.inicial()).toBe('?');
      expect(component.error()).toBe('No se pudo cargar el caballo.');
      expect(component.cargando()).toBe(false);
    });
  });

  describe('form helpers', () => {
    beforeEach(() => crear());

    it('onRazaChange', () => {
      component.onRazaChange('');
      expect(component.idRazaSeleccionada()).toBeNull();
      component.razaPersonalizada.set('Mestizo');
      component.onRazaChange('-1');
      expect(component.razaEsOtro()).toBe(true);
      fixture.detectChanges();
      component.onRazaChange('2');
      expect(component.razaPersonalizada()).toBe('');
    });

    it('onAlturaChange and onPrecioChange', () => {
      component.onAlturaChange('');
      expect(component.altura()).toBeNull();
      component.onAlturaChange('1,7');
      expect(component.altura()).toBe(1.7);
      component.onAlturaChange('x');
      expect(component.altura()).toBeNull();

      component.onPrecioChange('  ');
      expect(component.precio()).toBeNull();
      component.onPrecioChange('');
      expect(component.precio()).toBeNull();
      component.onPrecioChange('2,5');
      expect(component.precio()).toBe(2.5);
      component.onPrecioChange('x');
      expect(component.precio()).toBeNull();
    });

    it('onDisponibilidadChange', () => {
      component.onDisponibilidadChange('No disponible');
      expect(component.disponibilidad()).toBe('No disponible');
    });

    it('should select and remove new photos', () => {
      const a = new File(['a'], 'a.png');
      const b = new File(['b'], 'b.png');
      component.onFotosSeleccionadas({ target: { files: [a, b] } } as unknown as Event);
      fixture.detectChanges();
      component.quitarFotoNueva(1);
      expect(component.fotosNuevas()).toEqual([a]);
      component.onFotosSeleccionadas({ target: { files: null } } as unknown as Event);
      expect(component.fotosNuevas()).toEqual([]);
    });
  });

  describe('existing photos', () => {
    beforeEach(() => crear());

    it('should open and cancel the delete modal', () => {
      component.pedirEliminarFoto(1);
      fixture.detectChanges();
      expect(component.modalEliminarFotoAbierto()).toBe(true);
      component.cancelarEliminarFoto();
      expect(component.idFotoParaEliminar()).toBeNull();
      expect(component.modalEliminarFotoAbierto()).toBe(false);
    });

    it('should do nothing without a selected photo', () => {
      component.confirmarEliminarFoto();
      expect(caballos['eliminarFoto']).not.toHaveBeenCalled();
    });

    it('should delete the selected photo', () => {
      component.pedirEliminarFoto(1);
      component.confirmarEliminarFoto();
      expect(caballos['eliminarFoto']).toHaveBeenCalledWith(7, 1);
      expect(component.fotos().map((f) => f.id_foto)).toEqual([2]);
      expect(component.modalEliminarFotoAbierto()).toBe(false);
    });

    it('should report delete errors', () => {
      caballos['eliminarFoto'].mockReturnValue(throwError(() => new Error('x')));
      component.pedirEliminarFoto(1);
      component.confirmarEliminarFoto();
      expect(component.error()).toBe('No se pudo eliminar la foto.');
      expect(component.fotos().length).toBe(2);
    });
  });

  describe('guardar', () => {
    beforeEach(() => crear());

    it('should do nothing without a loaded horse', () => {
      component.caballo.set(null);
      component.guardar();
      expect(caballos['actualizarCaballo']).not.toHaveBeenCalled();
    });

    it('should validate the name', () => {
      component.nombre.set(' ');
      component.guardar();
      expect(component.error()).toBe('El nombre es obligatorio.');
    });

    it('should validate the breed', () => {
      component.onRazaChange('');
      component.guardar();
      expect(component.error()).toBe('Selecciona una raza.');
      component.onRazaChange('-1');
      component.guardar();
      expect(component.error()).toBe('Escribe la raza.');
    });

    it('should validate mandatory fields', () => {
      component.altura.set(null);
      component.guardar();
      expect(component.error()).toBe('Completa todos los campos obligatorios.');
    });

    it('should validate the price for stallions', () => {
      component.precio.set(null);
      component.guardar();
      expect(component.error()).toBe('Debes ingresar un precio válido.');
    });

    it('should update and go back when there are no new photos', () => {
      component.guardar();
      expect(caballos['actualizarCaballo']).toHaveBeenCalledWith(7, {
        nombre: 'Rayo',
        fecha_nacimiento: '2020-01-01',
        altura: 1.5,
        color: 'Negro',
        ubicacion: 'Bogotá',
        descripcion: 'Manso',
        disponibilidad: 'Disponible',
        precio: 1000,
        id_raza: 1,
      });
      expect(caballos['subirFotos']).not.toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/mis-caballos']);
      expect(component.guardando()).toBe(false);
    });

    it('should send a null price and custom breed for mares', () => {
      component.caballo.set({ ...CABALLO, sexo: 'Hembra' });
      component.precio.set(null);
      component.onRazaChange('-1');
      component.razaPersonalizada.set(' Mestiza ');
      component.guardar();
      expect(caballos['actualizarCaballo']).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ precio: null, raza_personalizada: 'Mestiza' }),
      );
    });

    it('should upload new photos after updating', () => {
      const a = new File(['a'], 'a.png');
      component.fotosNuevas.set([a]);
      component.guardar();
      expect(caballos['subirFotos']).toHaveBeenCalledWith(7, [a]);
      expect(router.navigate).toHaveBeenCalledWith(['/mis-caballos']);
    });

    it('should report photo upload errors', () => {
      caballos['subirFotos'].mockReturnValue(throwError(() => new Error('x')));
      component.fotosNuevas.set([new File(['a'], 'a.png')]);
      component.guardar();
      expect(component.error()).toBe('Cambios guardados, pero fallaron las fotos nuevas.');
      expect(component.guardando()).toBe(false);
    });

    it('should show the backend detail or a generic error', () => {
      caballos['actualizarCaballo'].mockReturnValue(
        throwError(() => ({ error: { detail: 'No autorizado' } })),
      );
      component.guardar();
      expect(component.error()).toBe('No autorizado');

      caballos['actualizarCaballo'].mockReturnValue(throwError(() => ({})));
      component.guardar();
      expect(component.error()).toBe('No se pudieron guardar los cambios.');
    });
  });

  describe('delete horse', () => {
    beforeEach(() => crear());

    it('should open and cancel the modal', () => {
      component.pedirEliminarCaballo();
      fixture.detectChanges();
      expect(component.modalEliminarCaballoAbierto()).toBe(true);
      component.cancelarEliminarCaballo();
      expect(component.modalEliminarCaballoAbierto()).toBe(false);
    });

    it('should delete and go back', () => {
      component.pedirEliminarCaballo();
      component.confirmarEliminarCaballo();
      expect(caballos['eliminarCaballo']).toHaveBeenCalledWith(7);
      expect(router.navigate).toHaveBeenCalledWith(['/mis-caballos']);
    });

    it('should report delete errors', () => {
      caballos['eliminarCaballo'].mockReturnValue(throwError(() => new Error('x')));
      component.confirmarEliminarCaballo();
      expect(component.error()).toBe('No se pudo eliminar el caballo.');
      expect(component.modalEliminarCaballoAbierto()).toBe(false);
    });
  });

  describe('navigation and menu', () => {
    beforeEach(() => crear());

    it('should navigate and manage the menu', () => {
      component.cancelar();
      expect(router.navigate).toHaveBeenCalledWith(['/mis-caballos']);
      component.toggleMenu();
      fixture.detectChanges();
      expect(component.menuAbierto()).toBe(true);
      component.cerrarMenu();
      expect(component.menuAbierto()).toBe(false);
      component.toggleMenu();
      component.irAMisCaballos();
      expect(component.menuAbierto()).toBe(false);
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
