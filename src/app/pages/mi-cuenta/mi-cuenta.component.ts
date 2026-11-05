import { Component, computed, inject, signal } from '@angular/core';

import { CurrencyPipe } from '@angular/common';

import { FormsModule } from '@angular/forms';

import { HttpErrorResponse } from '@angular/common/http';

import { Router } from '@angular/router';

import { catchError, forkJoin, of } from 'rxjs';

import {
  CuentaService,
  FOTO_MAX_BYTES,
  FOTO_TIPOS_PERMITIDOS,
  Perfil,
  urlDeSubida,
} from '../../Services/cuenta.service';

import { CaballoService, Publicacion } from '../../Services/caballo.service';

import { ConversacionService, ResumenConversacion } from '../../Services/conversacion.service';

import { LogService } from '../../Services/log.service';

import { ContadorDirective } from '../../directives/contador.directive';

import { RecortarFotoComponent } from '../../components/recortar-foto/recortar-foto.component';

import { environment } from '../../../environments/environment';

// Publicación con la que chateé: la conversación más reciente y, si sigue activa, su publicación
export interface PublicacionChateada {
  conversacion: ResumenConversacion;
  publicacion: Publicacion | null;
}

const MESES_ES = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' });

@Component({
  selector: 'app-mi-cuenta',
  standalone: true,
  imports: [CurrencyPipe, FormsModule, ContadorDirective, RecortarFotoComponent],
  templateUrl: './mi-cuenta.component.html',
  styleUrls: ['./mi-cuenta.component.css'],
})
export class MiCuentaComponent {
  private readonly cuenta = inject(CuentaService);
  private readonly caballos = inject(CaballoService);
  private readonly chat = inject(ConversacionService);
  private readonly router = inject(Router);
  private readonly log = inject(LogService);

  readonly esqueletoTarjetas = [0, 1, 2];
  readonly tiposFoto = FOTO_TIPOS_PERMITIDOS.join(',');

  perfil = signal<Perfil | null>(null);
  cargandoPerfil = signal(true);
  errorPerfil = signal('');

  publicaciones = signal<Publicacion[]>([]);
  conversaciones = signal<ResumenConversacion[]>([]);
  cargandoActividad = signal(true);

  // Edición del perfil (en la misma columna, como en GitHub)
  editando = signal(false);
  guardando = signal(false);
  errorEdicion = signal('');
  formNombre = signal('');
  formTelefono = signal('');
  formDepartamento = signal('');
  formCiudad = signal('');
  sugerenciasDepartamentos = signal<string[]>([]);
  sugerenciasCiudades = signal<string[]>([]);

  // Foto de perfil: se elige, se encuadra en la ventana de recorte y se sube
  archivoParaRecortar = signal<File | null>(null);
  subiendoFoto = signal(false);
  errorFoto = signal('');

  // ======================================================
  // DATOS DERIVADOS
  // ======================================================

  inicial = computed(() => this.perfil()?.nombre.trim().charAt(0).toUpperCase() || '?');

  urlFoto = computed(() => urlDeSubida(this.perfil()?.foto_perfil));

  ubicacion = computed(() => {
    const p = this.perfil();
    return [p?.ciudad, p?.departamento].filter(Boolean).join(', ');
  });

  miembroDesde = computed(() => {
    const fecha = this.perfil()?.fecha_registro;
    return fecha ? MESES_ES.format(new Date(`${fecha}T00:00:00`)) : '';
  });

  misPublicaciones = computed(() => this.publicaciones().filter((p) => p.es_mia));

  // Publicaciones de otros con las que chateé (una por publicación, la conversación más reciente)
  chateadas = computed<PublicacionChateada[]>(() => {
    const porId = new Map(this.publicaciones().map((p) => [p.id_publicacion, p]));
    const vistas = new Set<number>();

    return this.conversaciones()
      .filter((c) => !c.soy_vendedor)
      .filter((c) => !vistas.has(c.id_publicacion) && vistas.add(c.id_publicacion))
      .map((c) => ({ conversacion: c, publicacion: porId.get(c.id_publicacion) ?? null }));
  });

  mensajesSinLeer = computed(() =>
    this.conversaciones().reduce((total, c) => total + c.no_leidos, 0),
  );

  // ======================================================
  // CARGA
  // ======================================================

  constructor() {
    this.cargarPerfil();
    this.cargarActividad();
  }

  cargarPerfil(): void {
    this.cargandoPerfil.set(true);
    this.errorPerfil.set('');

    this.cuenta.obtenerPerfil().subscribe({
      next: (perfil) => {
        this.perfil.set(perfil);
        this.cargandoPerfil.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.log.error('Error cargando el perfil', { status: e.status });
        this.errorPerfil.set('No fue posible cargar tu perfil.');
        this.cargandoPerfil.set(false);
      },
    });
  }

  // Si una de las dos listas falla, la otra se muestra igual
  private cargarActividad(): void {
    forkJoin({
      publicaciones: this.caballos.listarPublicaciones().pipe(catchError(() => of([]))),
      conversaciones: this.chat.listar().pipe(catchError(() => of([]))),
    }).subscribe(({ publicaciones, conversaciones }) => {
      this.publicaciones.set(publicaciones);
      this.conversaciones.set(conversaciones);
      this.cargandoActividad.set(false);
    });
  }

  // ======================================================
  // EDITAR PERFIL
  // ======================================================

  editarPerfil(): void {
    const p = this.perfil();
    if (!p) return;

    this.formNombre.set(p.nombre);
    this.formTelefono.set(p.telefono ?? '');
    this.formDepartamento.set(p.departamento ?? '');
    this.formCiudad.set(p.ciudad ?? '');
    this.errorEdicion.set('');
    this.editando.set(true);

    if (!this.sugerenciasDepartamentos().length) {
      this.cuenta.sugerirDepartamentos().subscribe({
        next: (d) => this.sugerenciasDepartamentos.set(d),
        error: () => this.sugerenciasDepartamentos.set([]),
      });
    }
    this.cargarSugerenciasCiudades(this.formDepartamento());
  }

  cambiarDepartamento(departamento: string): void {
    const cambio = departamento.trim() !== this.formDepartamento().trim();
    this.formDepartamento.set(departamento);
    if (!cambio) return;

    this.formCiudad.set('');
    this.cargarSugerenciasCiudades(departamento);
  }

  private cargarSugerenciasCiudades(departamento: string): void {
    if (!departamento.trim()) {
      this.sugerenciasCiudades.set([]);
      return;
    }
    this.cuenta.sugerirCiudades(departamento.trim()).subscribe({
      next: (c) => this.sugerenciasCiudades.set(c),
      error: () => this.sugerenciasCiudades.set([]),
    });
  }

  cancelarEdicion(): void {
    this.editando.set(false);
    this.errorEdicion.set('');
  }

  guardarPerfil(): void {
    const nombre = this.formNombre().trim();
    const departamento = this.formDepartamento().trim();
    const ciudad = this.formCiudad().trim();

    if (nombre.length < 2) {
      this.errorEdicion.set('El nombre debe tener al menos 2 caracteres.');
      return;
    }
    if (Boolean(ciudad) !== Boolean(departamento)) {
      this.errorEdicion.set('Escribe el departamento y la ciudad, o deja ambos vacíos.');
      return;
    }

    this.guardando.set(true);
    this.errorEdicion.set('');

    this.cuenta
      .actualizarPerfil({
        nombre,
        telefono: this.formTelefono().trim() || null,
        departamento: departamento || null,
        ciudad: ciudad || null,
      })
      .subscribe({
        next: (perfil) => {
          this.perfil.set(perfil);
          this.guardando.set(false);
          this.editando.set(false);
          this.log.info('Perfil actualizado');
        },
        error: (e: HttpErrorResponse) => {
          const detalle = e.error?.detail;
          this.errorEdicion.set(
            typeof detalle === 'string' ? detalle : 'No fue posible guardar los cambios.',
          );
          this.guardando.set(false);
        },
      });
  }

  // ======================================================
  // FOTO DE PERFIL
  // ======================================================

  elegirFoto(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = ''; // permite volver a elegir el mismo archivo
    if (!archivo) return;

    this.errorFoto.set('');
    if (!FOTO_TIPOS_PERMITIDOS.includes(archivo.type)) {
      this.errorFoto.set('Elige una imagen JPG, PNG o WEBP.');
      return;
    }
    if (archivo.size > FOTO_MAX_BYTES) {
      this.errorFoto.set('La imagen no puede pesar más de 5 MB.');
      return;
    }

    this.archivoParaRecortar.set(archivo); // abre la ventana para encuadrarla
  }

  cerrarRecorte(): void {
    this.archivoParaRecortar.set(null);
  }

  // Recibe el recorte cuadrado de la ventana y lo sube
  guardarFoto(recorte: File): void {
    this.subiendoFoto.set(true);
    this.errorFoto.set('');

    this.cuenta.subirFoto(recorte).subscribe({
      next: (perfil) => {
        this.perfil.set(perfil);
        this.subiendoFoto.set(false);
        this.cerrarRecorte();
        this.log.info('Foto de perfil actualizada');
      },
      error: (e: HttpErrorResponse) => {
        this.cerrarRecorte();
        this.fallaFoto(e, 'No fue posible subir la foto.');
      },
    });
  }

  quitarFoto(): void {
    this.subiendoFoto.set(true);
    this.errorFoto.set('');

    this.cuenta.quitarFoto().subscribe({
      next: (perfil) => {
        this.perfil.set(perfil);
        this.subiendoFoto.set(false);
        this.log.info('Foto de perfil eliminada');
      },
      error: (e: HttpErrorResponse) => this.fallaFoto(e, 'No fue posible quitar la foto.'),
    });
  }

  private fallaFoto(e: HttpErrorResponse, mensaje: string): void {
    const detalle = e.error?.detail;
    this.errorFoto.set(typeof detalle === 'string' ? detalle : mensaje);
    this.subiendoFoto.set(false);
  }

  // ======================================================
  // PRESENTACIÓN Y NAVEGACIÓN
  // ======================================================

  foto(publicacion: Publicacion | null): string | null {
    return publicacion?.foto_principal
      ? `${environment.uploadsUrl}${publicacion.foto_principal}`
      : null;
  }

  // "hace 5 min", "hace 2 h", "ayer", o la fecha
  haceCuanto(fechaIso: string | null): string {
    if (!fechaIso) return '';
    const minutos = Math.round((Date.now() - new Date(fechaIso).getTime()) / 60000);
    if (minutos < 1) return 'ahora';
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.round(minutos / 60);
    if (horas < 24) return `hace ${horas} h`;
    const dias = Math.round(horas / 24);
    if (dias === 1) return 'ayer';
    if (dias < 7) return `hace ${dias} días`;
    return new Date(fechaIso).toLocaleDateString('es-CO');
  }

  crearContrasena(): void {
    void this.router.navigate(['/recuperar-password'], { queryParams: { modo: 'crear' } });
  }

  irAPublicacion(idPublicacion: number): void {
    void this.router.navigate(['/publicaciones', idPublicacion]);
  }

  irAConversacion(idConversacion: number): void {
    void this.router.navigate(['/conversaciones', idConversacion]);
  }

  irAMisCaballos(): void {
    void this.router.navigate(['/mis-caballos']);
  }

  publicar(): void {
    void this.router.navigate(['/publicaciones/nueva']);
  }

  volver(): void {
    void this.router.navigate([this.perfil()?.es_admin ? '/admin' : '/marketplace']);
  }
}
