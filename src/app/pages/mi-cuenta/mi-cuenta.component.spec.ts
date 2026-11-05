import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { MiCuentaComponent } from './mi-cuenta.component';
import { CuentaService, Perfil } from '../../Services/cuenta.service';
import { CaballoService, Publicacion } from '../../Services/caballo.service';
import { ConversacionService, ResumenConversacion } from '../../Services/conversacion.service';
import { LogService } from '../../Services/log.service';

const logMock = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), flush: vi.fn() };

const PERFIL: Perfil = {
  id: 14,
  nombre: 'Data Horse',
  correo: 'datahorse3@gmail.com',
  telefono: null,
  ciudad: 'Chía',
  departamento: 'Cundinamarca',
  fecha_registro: '2026-10-20',
  es_admin: true,
  solo_google: false,
  foto_perfil: null,
};

const publicacion = (p: Partial<Publicacion>): Publicacion =>
  ({
    id_publicacion: 1,
    nombre: 'Trueno',
    raza: 'Criollo',
    sexo: 'Macho',
    precio: 4500000,
    es_mia: false,
    foto_principal: 'uploads/caballos/trueno.jpg',
    ...p,
  }) as Publicacion;

const conversacion = (c: Partial<ResumenConversacion>): ResumenConversacion => ({
  id_conversacion: 1,
  id_publicacion: 1,
  titulo_publicacion: 'Rayo - Macho',
  soy_vendedor: false,
  otro_usuario: { id: 2, nombre: 'David Manuel' },
  ultimo_mensaje: 'Hola, ¿sigue disponible?',
  fecha_ultimo_mensaje: new Date().toISOString(),
  ultimo_mensaje_es_mio: true,
  no_leidos: 0,
  fecha_creacion: '2026-11-04',
  ...c,
});

const PUBLICACIONES = [
  publicacion({ id_publicacion: 1, nombre: 'Rayo' }),
  publicacion({ id_publicacion: 20, nombre: 'Trueno', es_mia: true }),
  publicacion({
    id_publicacion: 21,
    nombre: 'Centella',
    es_mia: true,
    precio: null,
    foto_principal: null,
  }),
];

const CONVERSACIONES = [
  conversacion({ id_conversacion: 5, id_publicacion: 1, no_leidos: 2 }),
  // Más vieja, misma publicación: no se repite
  conversacion({ id_conversacion: 3, id_publicacion: 1 }),
  // Alguien me escribe por una publicación mía: no es una "publicación con la que chateé"
  conversacion({ id_conversacion: 7, id_publicacion: 20, soy_vendedor: true, no_leidos: 1 }),
  // La publicación ya no está activa: se muestra sin foto
  conversacion({ id_conversacion: 9, id_publicacion: 99, titulo_publicacion: 'Vendido - Macho' }),
];

describe('MiCuentaComponent', () => {
  let fixture: ComponentFixture<MiCuentaComponent>;
  let component: MiCuentaComponent;
  let router: Router;
  let cuenta: Record<string, ReturnType<typeof vi.fn>>;
  let caballos: Record<string, ReturnType<typeof vi.fn>>;
  let chat: Record<string, ReturnType<typeof vi.fn>>;

  const html = () => fixture.nativeElement as HTMLElement;
  const texto = () => html().textContent ?? '';

  const crear = async () => {
    await TestBed.configureTestingModule({
      imports: [MiCuentaComponent],
      providers: [
        provideRouter([]),
        { provide: LogService, useValue: logMock },
        { provide: CuentaService, useValue: cuenta },
        { provide: CaballoService, useValue: caballos },
        { provide: ConversacionService, useValue: chat },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(MiCuentaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    cuenta = {
      obtenerPerfil: vi.fn().mockReturnValue(of(structuredClone(PERFIL))),
      actualizarPerfil: vi.fn(),
      sugerirDepartamentos: vi.fn().mockReturnValue(of(['Antioquia', 'Cundinamarca'])),
      sugerirCiudades: vi.fn().mockReturnValue(of(['Chía', 'Zipaquirá'])),
      subirFoto: vi.fn(),
      quitarFoto: vi.fn(),
    };
    caballos = { listarPublicaciones: vi.fn().mockReturnValue(of(PUBLICACIONES)) };
    chat = { listar: vi.fn().mockReturnValue(of(CONVERSACIONES)) };
  });

  describe('profile', () => {
    it('should show the profile like a GitHub card', async () => {
      await crear();
      expect(html().querySelector('.mc-avatar span')?.textContent?.trim()).toBe('D');
      expect(html().querySelector('.mc-nombre')?.textContent).toContain('Data Horse');
      expect(texto()).toContain('datahorse3@gmail.com');
      expect(texto()).toContain('Chía, Cundinamarca');
      expect(texto()).toContain('Sin teléfono');
      expect(texto()).toContain('Miembro desde octubre de 2026');
      expect(texto()).toContain('Administrador');
      expect(texto()).not.toContain('Entras con Google');
    });

    it('should show skeletons while loading', async () => {
      cuenta['obtenerPerfil'].mockReturnValue(NEVER);
      caballos['listarPublicaciones'].mockReturnValue(NEVER);
      await crear();
      expect(html().querySelector('.mc-perfil-esqueleto')).not.toBeNull();
      expect(html().querySelectorAll('.mc-tarjeta-esqueleto').length).toBe(3);
      expect(html().querySelector('.mc-nombre')).toBeNull();
    });

    it('should offer to create a password for Google-only accounts', async () => {
      cuenta['obtenerPerfil'].mockReturnValue(
        of({ ...PERFIL, es_admin: false, solo_google: true }),
      );
      await crear();
      expect(texto()).toContain('Entras con Google');
      component.crearContrasena();
      expect(router.navigate).toHaveBeenCalledWith(['/recuperar-password'], {
        queryParams: { modo: 'crear' },
      });
    });

    it('should show an error with retry if the profile fails', async () => {
      cuenta['obtenerPerfil'].mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 500 })),
      );
      await crear();
      expect(html().querySelector('.mc-error')?.textContent).toContain(
        'No fue posible cargar tu perfil',
      );

      cuenta['obtenerPerfil'].mockReturnValue(of(PERFIL));
      (html().querySelector('.mc-error button') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(html().querySelector('.mc-nombre')?.textContent).toContain('Data Horse');
    });
  });

  describe('edit profile', () => {
    beforeEach(async () => {
      await crear();
      component.editarPerfil();
      fixture.detectChanges();
    });

    it('should open the form with the current data and suggestions', () => {
      expect(html().querySelector('.mc-form')).not.toBeNull();
      expect(component.formNombre()).toBe('Data Horse');
      expect(component.formCiudad()).toBe('Chía');
      expect(cuenta['sugerirDepartamentos']).toHaveBeenCalled();
      expect(cuenta['sugerirCiudades']).toHaveBeenCalledWith('Cundinamarca');
      expect(texto()).toContain('El correo no se puede cambiar');
    });

    it('should clear the city when the department changes', () => {
      component.cambiarDepartamento('Antioquia');
      expect(component.formCiudad()).toBe('');
      expect(cuenta['sugerirCiudades']).toHaveBeenLastCalledWith('Antioquia');
    });

    it('should save and show the updated profile', () => {
      const actualizado = { ...PERFIL, nombre: 'Data Horse SAS', telefono: '3001234567' };
      cuenta['actualizarPerfil'].mockReturnValue(of(actualizado));
      component.formNombre.set('  Data Horse SAS ');
      component.formTelefono.set('3001234567');

      component.guardarPerfil();
      fixture.detectChanges();

      expect(cuenta['actualizarPerfil']).toHaveBeenCalledWith({
        nombre: 'Data Horse SAS',
        telefono: '3001234567',
        departamento: 'Cundinamarca',
        ciudad: 'Chía',
      });
      expect(component.editando()).toBe(false);
      expect(html().querySelector('.mc-nombre')?.textContent).toContain('Data Horse SAS');
      expect(texto()).toContain('3001234567');
    });

    it('should validate before sending', () => {
      component.formNombre.set('D');
      component.guardarPerfil();
      expect(component.errorEdicion()).toContain('al menos 2 caracteres');

      component.formNombre.set('Data');
      component.cambiarDepartamento('');
      component.formCiudad.set('Chía');
      component.guardarPerfil();
      expect(component.errorEdicion()).toContain('departamento y la ciudad');
      expect(cuenta['actualizarPerfil']).not.toHaveBeenCalled();
    });

    it('should show the backend error and keep the form open', () => {
      cuenta['actualizarPerfil'].mockReturnValue(
        throwError(
          () => new HttpErrorResponse({ status: 422, error: { detail: 'Teléfono no válido.' } }),
        ),
      );
      component.guardarPerfil();
      fixture.detectChanges();
      expect(component.editando()).toBe(true);
      expect(html().querySelector('.mc-error-form')?.textContent).toContain('Teléfono no válido.');
    });

    it('should cancel without saving', () => {
      component.cancelarEdicion();
      fixture.detectChanges();
      expect(html().querySelector('.mc-form')).toBeNull();
      expect(cuenta['actualizarPerfil']).not.toHaveBeenCalled();
    });
  });

  describe('profile photo', () => {
    const crearUrlOriginal = URL.createObjectURL;
    const revocarUrlOriginal = URL.revokeObjectURL;
    const elegir = (archivo: File) => {
      const input = html().querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(input, 'files', { value: [archivo], configurable: true });
      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();
    };
    const png = (bytes = 10) => new File(['x'.repeat(bytes)], 'yo.png', { type: 'image/png' });
    const recorte = new File(['jpeg'], 'foto-perfil.jpg', { type: 'image/jpeg' });
    const ventana = () => html().querySelector('app-recortar-foto');

    // jsdom no implementa createObjectURL (lo usa la ventana de recorte)
    beforeEach(() => {
      URL.createObjectURL = vi.fn(() => 'blob:vista');
      URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      URL.createObjectURL = crearUrlOriginal;
      URL.revokeObjectURL = revocarUrlOriginal;
    });

    it('should show the initial and a button to change the photo', async () => {
      await crear();
      expect(html().querySelector('.mc-avatar img')).toBeNull();
      expect(html().querySelector('.mc-avatar-cambiar')?.getAttribute('aria-label')).toBe(
        'Cambiar foto de perfil',
      );
      expect(texto()).not.toContain('Quitar foto');
    });

    it('should show the saved photo and offer to remove it', async () => {
      cuenta['obtenerPerfil'].mockReturnValue(
        of({ ...PERFIL, foto_perfil: '/uploads/perfiles/a.jpg' }),
      );
      await crear();
      expect((html().querySelector('.mc-avatar img') as HTMLImageElement).src).toContain(
        '/uploads/perfiles/a.jpg',
      );
      expect(texto()).toContain('Quitar foto');
    });

    it('should open the crop window after choosing an image', async () => {
      await crear();
      const archivo = png();
      elegir(archivo);

      expect(ventana()).not.toBeNull();
      expect(component.archivoParaRecortar()).toBe(archivo);
      expect(cuenta['subirFoto']).not.toHaveBeenCalled();
    });

    it('should upload the crop and close the window', async () => {
      await crear();
      elegir(png());
      cuenta['subirFoto'].mockReturnValue(
        of({ ...PERFIL, foto_perfil: '/uploads/perfiles/nueva.jpg' }),
      );

      component.guardarFoto(recorte);
      fixture.detectChanges();

      expect(cuenta['subirFoto']).toHaveBeenCalledWith(recorte);
      expect(ventana()).toBeNull();
      expect((html().querySelector('.mc-avatar img') as HTMLImageElement).src).toContain(
        'nueva.jpg',
      );
    });

    it('should close the window without uploading when cancelled', async () => {
      await crear();
      elegir(png());
      component.cerrarRecorte();
      fixture.detectChanges();

      expect(ventana()).toBeNull();
      expect(cuenta['subirFoto']).not.toHaveBeenCalled();
    });

    it('should reject wrong types and files over 5 MB without opening the window', async () => {
      await crear();
      elegir(new File(['x'], 'yo.gif', { type: 'image/gif' }));
      expect(component.errorFoto()).toContain('JPG, PNG o WEBP');

      elegir(png(5 * 1024 * 1024 + 1));
      expect(component.errorFoto()).toContain('5 MB');
      expect(ventana()).toBeNull();
    });

    it('should show the server error (e.g. not a real image)', async () => {
      await crear();
      elegir(png());
      cuenta['subirFoto'].mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { detail: 'El archivo no es una imagen válida' },
            }),
        ),
      );
      component.guardarFoto(recorte);
      fixture.detectChanges();

      expect(html().querySelector('.mc-error-form')?.textContent).toContain(
        'no es una imagen válida',
      );
      expect(component.subiendoFoto()).toBe(false);
      expect(ventana()).toBeNull();
    });

    it('should remove the photo', async () => {
      cuenta['obtenerPerfil'].mockReturnValue(
        of({ ...PERFIL, foto_perfil: '/uploads/perfiles/a.jpg' }),
      );
      cuenta['quitarFoto'].mockReturnValue(of(PERFIL));
      await crear();

      component.quitarFoto();
      fixture.detectChanges();

      expect(cuenta['quitarFoto']).toHaveBeenCalled();
      expect(html().querySelector('.mc-avatar img')).toBeNull();
      expect(html().querySelector('.mc-avatar span')?.textContent?.trim()).toBe('D');
    });
  });

  describe('activity', () => {
    it('should list my active publications', async () => {
      await crear();
      const tarjetas = Array.from(html().querySelectorAll('.mc-tarjetas .mc-tarjeta'));
      expect(tarjetas.map((t) => t.querySelector('strong')?.textContent)).toEqual([
        'Trueno',
        'Centella',
      ]);
      expect(tarjetas[1].textContent).toContain('Sin precio');

      (tarjetas[0] as HTMLButtonElement).click();
      expect(router.navigate).toHaveBeenCalledWith(['/publicaciones', 20]);
    });

    it('should list the publications I chatted about, once each and newest first', async () => {
      await crear();
      expect(component.chateadas().map((c) => c.conversacion.id_conversacion)).toEqual([5, 9]);

      const chats = Array.from(html().querySelectorAll('.mc-chat'));
      expect(chats[0].textContent).toContain('Rayo - Macho');
      expect(chats[0].textContent).toContain('Vendedor: David Manuel');
      expect(chats[0].textContent).toContain('Tú: Hola, ¿sigue disponible?');
      expect(chats[0].querySelector('.mc-no-leidos')?.textContent?.trim()).toBe('2');
      expect(chats[0].querySelector('img')).not.toBeNull();
      expect(chats[1].querySelector('img')).toBeNull(); // ya no está activa

      (chats[0] as HTMLButtonElement).click();
      expect(router.navigate).toHaveBeenCalledWith(['/conversaciones', 5]);
    });

    it('should count unread messages from every conversation', async () => {
      await crear();
      expect(component.mensajesSinLeer()).toBe(3);
    });

    it('should show empty states', async () => {
      caballos['listarPublicaciones'].mockReturnValue(of([]));
      chat['listar'].mockReturnValue(of([]));
      await crear();
      expect(texto()).toContain('No tienes publicaciones activas.');
      expect(texto()).toContain('Todavía no has chateado con ningún vendedor.');

      (
        Array.from(html().querySelectorAll('button')).find((b) =>
          b.textContent?.includes('Publicar un caballo'),
        ) as HTMLButtonElement
      ).click();
      expect(router.navigate).toHaveBeenCalledWith(['/publicaciones/nueva']);
    });

    it('should still show one list if the other fails', async () => {
      chat['listar'].mockReturnValue(throwError(() => new Error('500')));
      await crear();
      expect(html().querySelectorAll('.mc-tarjetas .mc-tarjeta').length).toBe(2);
      expect(texto()).toContain('Todavía no has chateado');
    });
  });

  it('should format relative dates', async () => {
    await crear();
    const haceMin = (m: number) => new Date(Date.now() - m * 60000).toISOString();
    expect(component.haceCuanto(null)).toBe('');
    expect(component.haceCuanto(haceMin(0))).toBe('ahora');
    expect(component.haceCuanto(haceMin(5))).toBe('hace 5 min');
    expect(component.haceCuanto(haceMin(180))).toBe('hace 3 h');
    expect(component.haceCuanto(haceMin(60 * 24))).toBe('ayer');
    expect(component.haceCuanto(haceMin(60 * 24 * 3))).toBe('hace 3 días');
  });

  it('should go back to the admin panel or the marketplace', async () => {
    await crear();
    component.volver();
    expect(router.navigate).toHaveBeenCalledWith(['/admin']);

    component.perfil.set({ ...PERFIL, es_admin: false });
    component.volver();
    expect(router.navigate).toHaveBeenCalledWith(['/marketplace']);

    component.irAMisCaballos();
    expect(router.navigate).toHaveBeenCalledWith(['/mis-caballos']);
  });
});
