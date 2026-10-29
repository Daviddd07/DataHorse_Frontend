import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NuevaPublicacionComponent } from './nueva-publicacion.component';
import { CaballoService } from '../../../Services/caballo.service';

describe('NuevaPublicacionComponent', () => {
  let fixture: ComponentFixture<NuevaPublicacionComponent>;
  let component: NuevaPublicacionComponent;
  let router: Router;
  let caballos: Record<string, ReturnType<typeof vi.fn>>;
  const foto = new File(['x'], 'foto.png', { type: 'image/png' });

  const crear = async () => {
    await TestBed.configureTestingModule({
      imports: [NuevaPublicacionComponent],
      providers: [provideRouter([]), { provide: CaballoService, useValue: caballos }],
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(NuevaPublicacionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const llenar = (sexo: 'Macho' | 'Hembra' = 'Macho') => {
    component.elegirTipo(sexo);
    component.onRazaChange('1');
    component.nombre.set(' Rayo ');
    component.fechaNacimiento.set('2020-01-01');
    component.onAlturaChange('1,55');
    component.color.set(' Negro ');
    component.ubicacion.set(' Bogotá ');
    component.descripcion.set(' Manso ');
    component.onPrecioChange('1000000');
    component.fotosSeleccionadas.set([foto]);
  };

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    caballos = {
      listarRazas: vi.fn().mockReturnValue(of([{ id_raza: 1, nombre: 'Criollo' }])),
      crear: vi.fn().mockReturnValue(of({ id_caballo: 99 })),
      subirFotos: vi.fn().mockReturnValue(of([])),
    };
  });

  it('should load the breeds', async () => {
    await crear();
    expect(component.razas().length).toBe(1);
    expect(component.paso()).toBe('tipo');
  });

  it('should handle breed loading errors', async () => {
    caballos['listarRazas'].mockReturnValue(throwError(() => new Error('x')));
    await crear();
    expect(component.razas()).toEqual([]);
  });

  describe('steps and inputs', () => {
    beforeEach(() => crear());

    it('elegirTipo should go to the form and clear the price for mares', () => {
      component.precio.set(100);
      component.elegirTipo('Macho');
      expect(component.precio()).toBe(100);
      component.elegirTipo('Hembra');
      fixture.detectChanges();
      expect(component.precio()).toBeNull();
      expect(component.paso()).toBe('formulario');
      component.volver();
      expect(component.paso()).toBe('tipo');
    });

    it('should render the form for a stallion', () => {
      component.elegirTipo('Macho');
      component.onRazaChange('-1');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('form, input')).not.toBeNull();
    });

    it('onRazaChange should handle empty, custom and normal breeds', () => {
      component.onRazaChange('');
      expect(component.idRazaSeleccionada()).toBeNull();
      component.razaPersonalizada.set('Mestizo');
      component.onRazaChange('-1');
      expect(component.razaEsOtro()).toBe(true);
      expect(component.razaPersonalizada()).toBe('Mestizo');
      component.onRazaChange('3');
      expect(component.idRazaSeleccionada()).toBe(3);
      expect(component.razaPersonalizada()).toBe('');
    });

    it('onPrecioChange should parse numbers', () => {
      component.onPrecioChange('');
      expect(component.precio()).toBeNull();
      component.onPrecioChange(null as unknown as string);
      expect(component.precio()).toBeNull();
      component.onPrecioChange('12,5');
      expect(component.precio()).toBe(12.5);
      component.onPrecioChange('abc');
      expect(component.precio()).toBeNull();
    });

    it('onAlturaChange should parse numbers', () => {
      component.onAlturaChange('');
      expect(component.altura()).toBeNull();
      component.onAlturaChange('1,6');
      expect(component.altura()).toBe(1.6);
      component.onAlturaChange('x');
      expect(component.altura()).toBeNull();
    });

    it('onDisponibilidadChange should set the value', () => {
      component.onDisponibilidadChange('No disponible');
      expect(component.disponibilidad()).toBe('No disponible');
    });

    it('should select and remove photos', () => {
      const otra = new File(['y'], 'otra.png');
      component.onFotosSeleccionadas({ target: { files: [foto, otra] } } as unknown as Event);
      expect(component.fotosSeleccionadas().length).toBe(2);
      component.eliminarFoto(0);
      expect(component.fotosSeleccionadas()).toEqual([otra]);
      component.onFotosSeleccionadas({ target: { files: null } } as unknown as Event);
      expect(component.fotosSeleccionadas()).toEqual([]);
    });

    it('cancelar and irAlMarketplace should navigate', () => {
      component.cancelar();
      component.irAlMarketplace();
      expect(router.navigate).toHaveBeenCalledTimes(2);
      expect(router.navigate).toHaveBeenCalledWith(['/marketplace']);
    });
  });

  describe('guardar validations', () => {
    beforeEach(() => crear());

    it('should require the sex', () => {
      component.guardar();
      expect(component.error()).toBe('Selecciona si es Caballo o Yegua.');
    });

    it('should require the breed', () => {
      component.elegirTipo('Macho');
      component.guardar();
      expect(component.error()).toBe('Selecciona una raza.');
    });

    it('should require a custom breed name', () => {
      llenar();
      component.onRazaChange('-1');
      component.guardar();
      expect(component.error()).toBe('Escribe la raza del ejemplar.');
    });

    it('should reject future birth dates', () => {
      llenar();
      component.fechaNacimiento.set('2999-01-01');
      component.guardar();
      expect(component.error()).toBe('La fecha de nacimiento no puede ser una fecha futura.');
    });

    it('should require mandatory fields', () => {
      llenar();
      component.altura.set(0);
      component.guardar();
      expect(component.error()).toBe('Completa todos los campos obligatorios.');
    });

    it('should require a price for stallions', () => {
      llenar();
      component.precio.set(0);
      component.guardar();
      expect(component.error()).toBe('Debes ingresar un precio válido para el caballo.');
    });

    it('should require at least one photo', () => {
      llenar();
      component.fotosSeleccionadas.set([]);
      component.guardar();
      expect(component.error()).toBe('Debes subir al menos una foto del ejemplar.');
      expect(caballos['crear']).not.toHaveBeenCalled();
    });
  });

  describe('guardar submission', () => {
    beforeEach(() => crear());

    it('should create a stallion, upload photos and go to the marketplace', () => {
      llenar('Macho');
      component.guardar();
      expect(caballos['crear']).toHaveBeenCalledWith({
        nombre: 'Rayo',
        sexo: 'Macho',
        fecha_nacimiento: '2020-01-01',
        altura: 1.55,
        color: 'Negro',
        ubicacion: 'Bogotá',
        descripcion: 'Manso',
        disponibilidad: 'Disponible',
        precio: 1000000,
        id_raza: 1,
      });
      expect(caballos['subirFotos']).toHaveBeenCalledWith(99, [foto]);
      expect(router.navigate).toHaveBeenCalledWith(['/marketplace']);
      expect(component.enviando()).toBe(false);
    });

    it('should create a mare with a custom breed and show success', () => {
      llenar('Hembra');
      component.onRazaChange('-1');
      component.razaPersonalizada.set(' Mestiza ');
      component.guardar();
      expect(caballos['crear']).toHaveBeenCalledWith(
        expect.objectContaining({ precio: null, raza_personalizada: 'Mestiza', sexo: 'Hembra' }),
      );
      expect(component.exito()).toContain('Yegua registrada');
      expect(router.navigate).not.toHaveBeenCalled();
      fixture.detectChanges();
    });

    it('should finish directly if the photos were cleared meanwhile', () => {
      llenar('Macho');
      caballos['crear'].mockImplementation(() => {
        component.fotosSeleccionadas.set([]);
        return of({ id_caballo: 99 });
      });
      component.guardar();
      expect(caballos['subirFotos']).not.toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/marketplace']);
    });

    it('should report photo upload errors', () => {
      caballos['subirFotos'].mockReturnValue(throwError(() => new Error('x')));
      llenar();
      component.guardar();
      expect(component.error()).toBe('Caballo creado, pero fallaron las fotos. Intenta de nuevo.');
      expect(component.enviando()).toBe(false);
    });

    it('should show the backend detail when creation fails', () => {
      caballos['crear'].mockReturnValue(throwError(() => ({ error: { detail: 'Duplicado' } })));
      llenar();
      component.guardar();
      expect(component.error()).toBe('Duplicado');
    });

    it('should show a generic error when the detail is not a string', () => {
      caballos['crear'].mockReturnValue(throwError(() => ({ error: { detail: [{}] } })));
      llenar();
      component.guardar();
      expect(component.error()).toBe('No se pudo guardar la publicación. Intenta de nuevo.');
    });
  });
});
