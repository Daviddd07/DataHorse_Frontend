import { Component, computed, inject, signal } from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../Services/auth.service';

import {
  CaballoService,
  CaballoDetalle,
  CaballoUpdatePayload,
  FotoCaballoDetalle,
  Raza,
} from '../../Services/caballo.service';

import { environment } from '../../../environments/environment';

interface FotoVista extends FotoCaballoDetalle {
  urlCompleta: string;
}

@Component({
  selector: 'app-editar-caballo',
  standalone: true,

  imports: [CommonModule, FormsModule],

  templateUrl: './editar-caballo.component.html',

  styleUrl: './editar-caballo.component.css',
})
export class EditarCaballoComponent {
  private route = inject(ActivatedRoute);

  private router = inject(Router);

  private auth = inject(AuthService);

  private caballoService = inject(CaballoService);

  // Usuario en el header
  nombreUsuario = signal('');

  correoUsuario = signal('');

  inicial = computed(() => this.nombreUsuario().charAt(0).toUpperCase() || '?');

  menuAbierto = signal(false);

  // Estado del componente
  idCaballo = signal<number>(0);

  cargando = signal(true);

  guardando = signal(false);

  error = signal('');

  exito = signal('');

  // Datos del caballo
  caballo = signal<CaballoDetalle | null>(null);

  razas = signal<Raza[]>([]);

  // Campos editables
  nombre = signal('');
  idRazaSeleccionada = signal<number | null>(null);
  razaPersonalizada = signal('');
  razaEsOtro = computed(() => this.idRazaSeleccionada() === -1);
  fechaNacimiento = signal('');
  altura = signal<number | null>(null);
  color = signal('');
  ubicacion = signal('');
  descripcion = signal('');
  disponibilidad = signal<'Disponible' | 'No disponible'>('Disponible');
  precio = signal<number | null>(null);

  // Fotos
  fotos = signal<FotoVista[]>([]);

  fotosNuevas = signal<File[]>([]);

  idFotoParaEliminar = signal<number | null>(null);

  modalEliminarFotoAbierto = signal(false);

  modalEliminarCaballoAbierto = signal(false);

  constructor() {
    this.cargarUsuario();

    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.error.set('ID de caballo inválido.');
      this.cargando.set(false);
      return;
    }

    this.idCaballo.set(id);

    this.cargarRazas();

    this.cargarCaballo(id);
  }

  // ======================================================
  // CARGA DE DATOS
  // ======================================================

  private cargarUsuario(): void {
    this.auth.me().subscribe({
      next: (usuario) => {
        const primerNombre = usuario.nombre.trim().split(/\s+/)[0];

        this.nombreUsuario.set(primerNombre);

        this.correoUsuario.set(usuario.correo);
      },

      error: () => {
        this.nombreUsuario.set('');
      },
    });
  }

  private cargarRazas(): void {
    this.caballoService.listarRazas().subscribe({
      next: (razas) => this.razas.set(razas),

      error: (err) => {
        console.error('Error cargando razas:', err);
      },
    });
  }

  private cargarCaballo(id: number): void {
    this.cargando.set(true);
    this.error.set('');

    this.caballoService.obtenerCaballo(id).subscribe({
      next: (data) => {
        this.caballo.set(data);

        this.nombre.set(data.nombre);
        this.idRazaSeleccionada.set(data.id_raza);
        this.fechaNacimiento.set(data.fecha_nacimiento);
        this.altura.set(data.altura);
        this.color.set(data.color);
        this.ubicacion.set(data.ubicacion);
        this.descripcion.set(data.descripcion);
        this.disponibilidad.set(data.disponibilidad as 'Disponible' | 'No disponible');
        this.precio.set(data.precio);

        this.fotos.set(
          data.fotos.map((f) => ({
            ...f,
            urlCompleta: `${environment.uploadsUrl}${f.ruta}`,
          })),
        );

        this.cargando.set(false);
      },

      error: (err) => {
        console.error('Error cargando caballo:', err);

        this.error.set('No se pudo cargar el caballo.');
        this.cargando.set(false);
      },
    });
  }

  // ======================================================
  // HELPERS DE FORMULARIO
  // ======================================================

  onRazaChange(valor: string): void {
    if (!valor) {
      this.idRazaSeleccionada.set(null);
      return;
    }

    const id = Number(valor);

    this.idRazaSeleccionada.set(id);

    if (id !== -1) {
      this.razaPersonalizada.set('');
    }
  }

  onAlturaChange(valor: string): void {
    if (!valor) {
      this.altura.set(null);
      return;
    }

    const numero = Number(valor.replace(',', '.'));

    this.altura.set(Number.isNaN(numero) ? null : numero);
  }

  onPrecioChange(valor: string): void {
    if (!valor || valor.trim() === '') {
      this.precio.set(null);
      return;
    }

    const numero = Number(valor.replace(',', '.'));

    this.precio.set(Number.isNaN(numero) ? null : numero);
  }

  onDisponibilidadChange(valor: string): void {
    this.disponibilidad.set(valor as 'Disponible' | 'No disponible');
  }

  // ======================================================
  // FOTOS NUEVAS
  // ======================================================

  onFotosSeleccionadas(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.fotosNuevas.set(input.files ? Array.from(input.files) : []);
  }

  quitarFotoNueva(index: number): void {
    const actuales = this.fotosNuevas();

    this.fotosNuevas.set(actuales.filter((_, i) => i !== index));
  }

  // ======================================================
  // ELIMINAR FOTO EXISTENTE (con modal)
  // ======================================================

  pedirEliminarFoto(idFoto: number): void {
    this.idFotoParaEliminar.set(idFoto);
    this.modalEliminarFotoAbierto.set(true);
  }

  cancelarEliminarFoto(): void {
    this.idFotoParaEliminar.set(null);
    this.modalEliminarFotoAbierto.set(false);
  }

  confirmarEliminarFoto(): void {
    const idFoto = this.idFotoParaEliminar();

    if (idFoto === null) return;

    this.caballoService.eliminarFoto(this.idCaballo(), idFoto).subscribe({
      next: () => {
        this.fotos.update((actuales) => actuales.filter((f) => f.id_foto !== idFoto));

        this.modalEliminarFotoAbierto.set(false);
        this.idFotoParaEliminar.set(null);
      },

      error: (err) => {
        console.error('Error eliminando foto:', err);

        this.modalEliminarFotoAbierto.set(false);
        this.error.set('No se pudo eliminar la foto.');
      },
    });
  }

  // ======================================================
  // GUARDAR CAMBIOS
  // ======================================================

  guardar(): void {
    this.error.set('');
    this.exito.set('');

    const cab = this.caballo();

    if (!cab) return;

    // Validaciones
    if (!this.nombre().trim()) {
      this.error.set('El nombre es obligatorio.');
      return;
    }

    if (this.idRazaSeleccionada() === null) {
      this.error.set('Selecciona una raza.');
      return;
    }

    if (this.razaEsOtro() && !this.razaPersonalizada().trim()) {
      this.error.set('Escribe la raza.');
      return;
    }

    if (
      !this.fechaNacimiento() ||
      this.altura() === null ||
      this.altura()! <= 0 ||
      !this.color().trim() ||
      !this.ubicacion().trim() ||
      !this.descripcion().trim()
    ) {
      this.error.set('Completa todos los campos obligatorios.');
      return;
    }

    if (cab.sexo === 'Macho' && (this.precio() === null || this.precio()! <= 0)) {
      this.error.set('Debes ingresar un precio válido.');
      return;
    }

    // Payload
    const payload: CaballoUpdatePayload = {
      nombre: this.nombre().trim(),
      fecha_nacimiento: this.fechaNacimiento(),
      altura: this.altura()!,
      color: this.color().trim(),
      ubicacion: this.ubicacion().trim(),
      descripcion: this.descripcion().trim(),
      disponibilidad: this.disponibilidad(),
      precio: cab.sexo === 'Macho' ? Number(this.precio()) : null,
    };

    if (this.razaEsOtro()) {
      payload.raza_personalizada = this.razaPersonalizada().trim();
    } else {
      payload.id_raza = this.idRazaSeleccionada()!;
    }

    this.guardando.set(true);

    this.caballoService.actualizarCaballo(this.idCaballo(), payload).subscribe({
      next: () => {
        const nuevas = this.fotosNuevas();

        if (nuevas.length === 0) {
          this.guardando.set(false);
          this.router.navigate(['/mis-caballos']);
          return;
        }

        // Subir fotos nuevas
        this.caballoService.subirFotos(this.idCaballo(), nuevas).subscribe({
          next: () => {
            this.guardando.set(false);
            this.router.navigate(['/mis-caballos']);
          },

          error: (err) => {
            console.error('Error subiendo fotos:', err);

            this.guardando.set(false);
            this.error.set('Cambios guardados, pero fallaron las fotos nuevas.');
          },
        });
      },

      error: (err) => {
        console.error('Error actualizando:', err);

        this.guardando.set(false);

        const detalle = err?.error?.detail;

        this.error.set(
          typeof detalle === 'string' ? detalle : 'No se pudieron guardar los cambios.',
        );
      },
    });
  }

  // ======================================================
  // ELIMINAR CABALLO (con modal)
  // ======================================================

  pedirEliminarCaballo(): void {
    this.modalEliminarCaballoAbierto.set(true);
  }

  cancelarEliminarCaballo(): void {
    this.modalEliminarCaballoAbierto.set(false);
  }

  confirmarEliminarCaballo(): void {
    this.caballoService.eliminarCaballo(this.idCaballo()).subscribe({
      next: () => {
        this.modalEliminarCaballoAbierto.set(false);
        this.router.navigate(['/mis-caballos']);
      },

      error: (err) => {
        console.error('Error eliminando caballo:', err);

        this.modalEliminarCaballoAbierto.set(false);
        this.error.set('No se pudo eliminar el caballo.');
      },
    });
  }

  // ======================================================
  // NAVEGACIÓN
  // ======================================================

  cancelar(): void {
    this.router.navigate(['/mis-caballos']);
  }

  toggleMenu(): void {
    this.menuAbierto.update((v) => !v);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  irAMisCaballos(): void {
    this.menuAbierto.set(false);
    this.router.navigate(['/mis-caballos']);
  }

  cerrarSesion(): void {
    this.menuAbierto.set(false);

    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
