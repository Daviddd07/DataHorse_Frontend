import { Component, computed, inject, signal } from '@angular/core';

import { CommonModule } from '@angular/common';

import { Router } from '@angular/router';

import { forkJoin } from 'rxjs';

import { AuthService } from '../../../Services/auth.service';

import { AdminService, ResumenAdmin, UsuarioAdmin } from '../../../Services/admin.service';

import { LogService } from '../../../Services/log.service';

import { ContadorDirective } from '../../../directives/contador.directive';

import { DockDirective } from '../../../directives/dock.directive';

export type ColumnaUsuarios = Exclude<keyof UsuarioAdmin, 'id_usuario' | 'departamento'>;

type IconoTarjeta = 'usuarios' | 'nuevos' | 'caballos' | 'publicaciones';

interface Tarjeta {
  titulo: string;
  valor: number;
  detalle: string;
  icono: IconoTarjeta;
}

@Component({
  selector: 'app-panel-admin',
  standalone: true,
  imports: [CommonModule, ContadorDirective, DockDirective],
  templateUrl: './panel-admin.component.html',
  styleUrls: ['../../../components/barra-lateral/barra-lateral.css', './panel-admin.component.css'],
})
export class PanelAdminComponent {
  private readonly auth = inject(AuthService);
  private readonly admin = inject(AdminService);
  private readonly router = inject(Router);
  private readonly log = inject(LogService);

  readonly columnas: { clave: ColumnaUsuarios; etiqueta: string; numerica?: boolean }[] = [
    { clave: 'nombre', etiqueta: 'Nombre' },
    { clave: 'correo', etiqueta: 'Correo' },
    { clave: 'rol', etiqueta: 'Rol' },
    { clave: 'estado', etiqueta: 'Estado' },
    { clave: 'fecha_registro', etiqueta: 'Registro' },
    { clave: 'ciudad', etiqueta: 'Ciudad' },
    { clave: 'caballos', etiqueta: 'Caballos', numerica: true },
    { clave: 'machos', etiqueta: 'Machos', numerica: true },
    { clave: 'yeguas', etiqueta: 'Yeguas', numerica: true },
    { clave: 'publicaciones_activas', etiqueta: 'Publicaciones', numerica: true },
  ];

  // Esqueleto de carga: cantidad de tarjetas y filas, y anchos variados para las barras
  readonly esqueletoTarjetas = [0, 1, 2, 3];
  readonly esqueletoBarras = ['85%', '60%', '72%', '40%', '28%'];
  readonly esqueletoFilas = [0, 1, 2, 3, 4, 5];

  // Las barras de razas empiezan a crecer cuando la sección ya entró, una tras otra.
  // Deben coincidir con los tiempos de "crecer-barra" en el CSS.
  readonly RETRASO_BARRAS_MS = 700;
  readonly PASO_BARRAS_MS = 90;

  // Inicial del administrador para el avatar de la barra lateral
  inicial = signal('?');

  resumen = signal<ResumenAdmin | null>(null);
  usuarios = signal<UsuarioAdmin[]>([]);
  cargando = signal(true);
  error = signal('');

  busqueda = signal('');
  ordenColumna = signal<ColumnaUsuarios>('fecha_registro');
  ordenAscendente = signal(false);

  // ======================================================
  // DATOS DERIVADOS
  // ======================================================

  tarjetas = computed<Tarjeta[]>(() => {
    const r = this.resumen();
    if (!r) return [];

    return [
      {
        titulo: 'Usuarios',
        valor: r.usuarios.total,
        detalle: `${r.usuarios.activos} activos · ${r.usuarios.pendientes} pendientes`,
        icono: 'usuarios',
      },
      {
        titulo: 'Nuevos (30 días)',
        valor: r.usuarios.nuevos_ultimos_30_dias,
        detalle: `${r.usuarios.administradores} administradores`,
        icono: 'nuevos',
      },
      {
        titulo: 'Caballos',
        valor: r.caballos.total,
        detalle: `${r.caballos.machos} machos · ${r.caballos.yeguas} yeguas`,
        icono: 'caballos',
      },
      {
        titulo: 'Publicaciones',
        valor: r.publicaciones.total,
        detalle: `${r.publicaciones.activas} activas`,
        icono: 'publicaciones',
      },
    ];
  });

  urlGrafana = computed(() => this.resumen()?.enlaces?.grafana ?? null);

  private readonly maxPorRaza = computed(() =>
    Math.max(1, ...(this.resumen()?.caballos.por_raza ?? []).map((r) => r.total)),
  );

  usuariosFiltrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const columna = this.ordenColumna();
    const direccion = this.ordenAscendente() ? 1 : -1;

    return this.usuarios()
      .filter(
        (u) =>
          !texto ||
          [u.nombre, u.correo, u.ciudad ?? '', u.departamento ?? ''].some((v) =>
            v.toLowerCase().includes(texto),
          ),
      )
      .sort((a, b) => comparar(a[columna], b[columna]) * direccion);
  });

  // ======================================================
  // CONSTRUCTOR
  // ======================================================

  constructor() {
    this.cargarDatos();
    this.auth.me().subscribe({
      next: (usuario) => this.inicial.set(usuario.nombre.trim().charAt(0).toUpperCase() || '?'),
      error: () => this.inicial.set('?'),
    });
  }

  cargarDatos(): void {
    this.cargando.set(true);
    this.error.set('');

    forkJoin({
      resumen: this.admin.obtenerResumen(),
      usuarios: this.admin.listarUsuarios(),
    }).subscribe({
      next: ({ resumen, usuarios }) => {
        this.resumen.set(resumen);
        this.usuarios.set(usuarios);
        this.cargando.set(false);
      },
      error: (e) => {
        this.log.error('Error cargando el panel de administración', { status: e?.status });
        this.error.set('No fue posible cargar la información del panel.');
        this.cargando.set(false);
      },
    });
  }

  // ======================================================
  // TABLA
  // ======================================================

  ordenarPor(columna: ColumnaUsuarios): void {
    if (this.ordenColumna() === columna) {
      this.ordenAscendente.update((v) => !v);
      return;
    }

    this.ordenColumna.set(columna);
    this.ordenAscendente.set(true);
  }

  ordenAria(columna: ColumnaUsuarios): 'ascending' | 'descending' | 'none' {
    if (this.ordenColumna() !== columna) return 'none';
    return this.ordenAscendente() ? 'ascending' : 'descending';
  }

  // activo_google: entra solo con Google porque aún no creó su contraseña
  etiquetaEstado(estado: string): string {
    return estado === 'activo_google' ? 'activo (Google)' : estado;
  }

  anchoBarra(total: number): string {
    return `${(total / this.maxPorRaza()) * 100}%`;
  }

  // ======================================================
  // NAVEGACIÓN
  // ======================================================

  irAlMarketplace(): void {
    void this.router.navigate(['/marketplace']);
  }

  cerrarSesion(): void {
    this.log.info('Cierre de sesión');
    this.log.flush();

    // Aunque el backend falle, igual sacamos al usuario
    this.auth.logout().subscribe({
      next: () => void this.router.navigate(['/login']),
      error: () => void this.router.navigate(['/login']),
    });
  }
}

function comparar(a: string | number | null, b: string | number | null): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a ?? '').localeCompare(String(b ?? ''), 'es', { sensitivity: 'base' });
}
