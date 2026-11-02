import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PanelAdminComponent } from './panel-admin.component';
import { AuthService } from '../../../Services/auth.service';
import { AdminService, ResumenAdmin, UsuarioAdmin } from '../../../Services/admin.service';
import { LogService } from '../../../Services/log.service';

const logMock = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), flush: vi.fn() };

const RESUMEN: ResumenAdmin = {
  usuarios: { total: 3, activos: 2, pendientes: 1, administradores: 1, nuevos_ultimos_30_dias: 2 },
  caballos: {
    total: 6,
    machos: 4,
    yeguas: 2,
    por_raza: [
      { raza: 'Criollo', total: 4 },
      { raza: 'Árabe', total: 2 },
      { raza: 'Frisón', total: 0 },
    ],
  },
  publicaciones: { total: 5, activas: 4 },
};

const usuario = (u: Partial<UsuarioAdmin>): UsuarioAdmin => ({
  id_usuario: 1,
  nombre: 'Ana',
  correo: 'ana@correo.com',
  rol: 'usuario',
  estado: 'activo',
  fecha_registro: '2026-09-24',
  ciudad: 'Bogotá',
  departamento: 'Cundinamarca',
  caballos: 0,
  machos: 0,
  yeguas: 0,
  publicaciones_activas: 0,
  ...u,
});

const USUARIOS: UsuarioAdmin[] = [
  usuario({ id_usuario: 1, nombre: 'Ana', fecha_registro: '2026-09-24', caballos: 6 }),
  usuario({
    id_usuario: 2,
    nombre: 'Beto',
    correo: 'beto@correo.com',
    rol: 'administrador',
    fecha_registro: '2026-10-20',
    ciudad: null,
    departamento: null,
    caballos: 1,
  }),
  usuario({
    id_usuario: 3,
    nombre: 'Carla',
    correo: 'carla@correo.com',
    estado: 'pendiente',
    fecha_registro: '2026-10-29',
    ciudad: 'Medellín',
    departamento: 'Antioquia',
    caballos: 3,
  }),
];

describe('PanelAdminComponent', () => {
  let fixture: ComponentFixture<PanelAdminComponent>;
  let component: PanelAdminComponent;
  let router: Router;
  let auth: Record<string, ReturnType<typeof vi.fn>>;
  let admin: Record<string, ReturnType<typeof vi.fn>>;

  const crear = async () => {
    await TestBed.configureTestingModule({
      imports: [PanelAdminComponent],
      providers: [
        provideRouter([]),
        { provide: LogService, useValue: logMock },
        { provide: AuthService, useValue: auth },
        { provide: AdminService, useValue: admin },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(PanelAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  const nombres = () => component.usuariosFiltrados().map((u) => u.nombre);
  const html = () => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    auth = { logout: vi.fn().mockReturnValue(of({})) };
    admin = {
      obtenerResumen: vi.fn().mockReturnValue(of(RESUMEN)),
      listarUsuarios: vi.fn().mockReturnValue(of(USUARIOS)),
    };
  });

  describe('loading', () => {
    it('should show the totals, breeds and users', async () => {
      await crear();
      expect(component.cargando()).toBe(false);
      expect(component.tarjetas().map((t) => t.valor)).toEqual([3, 2, 6, 5]);
      expect(component.tarjetas()[2].detalle).toBe('4 machos · 2 yeguas');
      expect(html().querySelectorAll('.tarjeta').length).toBe(4);
      expect(html().querySelectorAll('.razas li').length).toBe(3);
      expect(html().querySelectorAll('tbody tr').length).toBe(3);
      expect(html().textContent).toContain('Usuarios (3)');
    });

    it('should scale breed bars against the largest breed', async () => {
      await crear();
      expect(component.anchoBarra(4)).toBe('100%');
      expect(component.anchoBarra(2)).toBe('50%');
      expect(component.anchoBarra(0)).toBe('0%');
    });

    it('should not divide by zero when there are no breeds', async () => {
      admin['obtenerResumen'].mockReturnValue(
        of({ ...RESUMEN, caballos: { ...RESUMEN.caballos, por_raza: [] } }),
      );
      await crear();
      expect(component.anchoBarra(0)).toBe('0%');
    });

    it('should have no cards before the summary arrives', async () => {
      await crear();
      component.resumen.set(null);
      expect(component.tarjetas()).toEqual([]);
      expect(component.anchoBarra(1)).toBe('100%');
    });

    it('should show an error and allow retrying', async () => {
      admin['obtenerResumen'].mockReturnValue(throwError(() => ({ status: 500 })));
      await crear();
      expect(component.error()).toBe('No fue posible cargar la información del panel.');
      expect(logMock.error).toHaveBeenCalledWith('Error cargando el panel de administración', {
        status: 500,
      });

      admin['obtenerResumen'].mockReturnValue(of(RESUMEN));
      (html().querySelector('.admin-error button') as HTMLButtonElement).click();
      expect(component.error()).toBe('');
      expect(component.resumen()).toEqual(RESUMEN);
    });

    it('should log an error without status', async () => {
      admin['listarUsuarios'].mockReturnValue(throwError(() => undefined));
      await crear();
      expect(logMock.error).toHaveBeenCalledWith('Error cargando el panel de administración', {
        status: undefined,
      });
    });
  });

  describe('users table', () => {
    beforeEach(() => crear());

    it('should list the newest users first by default', () => {
      expect(nombres()).toEqual(['Carla', 'Beto', 'Ana']);
      expect(component.ordenAria('fecha_registro')).toBe('descending');
      expect(component.ordenAria('nombre')).toBe('none');
    });

    it('should search by name, email, city or department', () => {
      component.busqueda.set('  BETO ');
      expect(nombres()).toEqual(['Beto']);
      component.busqueda.set('medellín');
      expect(nombres()).toEqual(['Carla']);
      component.busqueda.set('cundinamarca');
      expect(nombres()).toEqual(['Ana']);
    });

    it('should label the account states', () => {
      expect(component.etiquetaEstado('activo_google')).toBe('activo (Google)');
      expect(component.etiquetaEstado('pendiente')).toBe('pendiente');
      const pendientes = html().querySelectorAll('.etiqueta-pendiente');
      expect(pendientes.length).toBe(1);
      expect(pendientes[0].textContent).toContain('pendiente');
    });

    it('should show a message when nothing matches', () => {
      const buscador = html().querySelector('.admin-buscar') as HTMLInputElement;
      buscador.value = 'nadie';
      buscador.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(nombres()).toEqual([]);
      expect(html().querySelector('.sin-resultados')?.textContent).toContain('No hay usuarios');
    });

    it('should sort by a text column and toggle the direction', () => {
      component.ordenarPor('nombre');
      expect(nombres()).toEqual(['Ana', 'Beto', 'Carla']);
      expect(component.ordenAria('nombre')).toBe('ascending');
      component.ordenarPor('nombre');
      expect(nombres()).toEqual(['Carla', 'Beto', 'Ana']);
    });

    it('should sort numbers numerically and empty cities first', () => {
      component.ordenarPor('caballos');
      expect(nombres()).toEqual(['Beto', 'Carla', 'Ana']);
      component.ordenarPor('ciudad');
      expect(nombres()).toEqual(['Beto', 'Ana', 'Carla']);
    });

    it('should sort when clicking a column header', () => {
      (html().querySelector('th button') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(component.ordenColumna()).toBe('nombre');
      expect(html().querySelector('th')?.getAttribute('aria-sort')).toBe('ascending');
    });
  });

  describe('navigation', () => {
    beforeEach(() => crear());

    it('should go to the marketplace', () => {
      component.irAlMarketplace();
      expect(router.navigate).toHaveBeenCalledWith(['/marketplace']);
    });

    it('should log out even if the backend fails', () => {
      component.cerrarSesion();
      expect(logMock.flush).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/login']);

      auth['logout'].mockReturnValue(throwError(() => new Error('500')));
      component.cerrarSesion();
      expect(router.navigate).toHaveBeenCalledTimes(2);
    });
  });
});
