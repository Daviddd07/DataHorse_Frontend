import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { CaballoService, Raza } from '../../../Services/caballo.service';

type Paso = 'tipo' | 'formulario';

@Component({
  selector: 'app-nueva-publicacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nueva-publicacion.component.html',
  styleUrl: './nueva-publicacion.component.css',
})
export class NuevaPublicacionComponent {
  private caballoService = inject(CaballoService);
  private router = inject(Router);

  /* ======================================================
     PASOS
  ====================================================== */

  paso = signal<Paso>('tipo');

  sexo = signal<'Macho' | 'Hembra' | null>(null);

  /* ======================================================
     RAZAS
  ====================================================== */

  razas = signal<Raza[]>([]);

  idRazaSeleccionada = signal<number | null>(null);

  razaEsOtro = computed(() => this.idRazaSeleccionada() === -1);

  razaPersonalizada = signal('');

  /* ======================================================
     DATOS DEL EJEMPLAR
  ====================================================== */

  nombre = signal('');

  fechaNacimiento = signal('');

  altura = signal<number | null>(null);

  color = signal('');

  ubicacion = signal('');

  descripcion = signal('');

  disponibilidad = signal<'Disponible' | 'No disponible'>('Disponible');

  /* ======================================================
     PRECIO
     Solo se muestra cuando es Caballo
  ====================================================== */

  precio = signal<number | null>(null);

  /* ======================================================
     ESTADO
  ====================================================== */

  enviando = signal(false);

  error = signal('');

  /* ======================================================
     CONSTRUCTOR
  ====================================================== */

  constructor() {
    this.caballoService.listarRazas().subscribe({
      next: (razas) => {
        this.razas.set(razas);
      },

      error: () => {
        this.razas.set([]);
      },
    });
  }

  /* ======================================================
     SELECCIONAR TIPO
  ====================================================== */

  elegirTipo(sexo: 'Macho' | 'Hembra'): void {
    this.sexo.set(sexo);

    // Si selecciona Yegua,
    // eliminamos cualquier precio anterior.
    if (sexo === 'Hembra') {
      this.precio.set(null);
    }

    this.paso.set('formulario');
  }

  /* ======================================================
     VOLVER A SELECCIONAR TIPO
  ====================================================== */

  volver(): void {
    this.paso.set('tipo');
  }

  /* ======================================================
     RAZA
  ====================================================== */

  onRazaChange(valor: string): void {
    this.idRazaSeleccionada.set(valor ? +valor : null);
  }

  /* ======================================================
     DISPONIBILIDAD
  ====================================================== */

  onDisponibilidadChange(valor: string): void {
    this.disponibilidad.set(valor as 'Disponible' | 'No disponible');
  }

  /* ======================================================
     CANCELAR
  ====================================================== */

  cancelar(): void {
    this.router.navigate(['/marketplace']);
  }

  /* ======================================================
     GUARDAR
  ====================================================== */

  guardar(): void {
    console.log('guardar() se ejecutó');

    this.error.set('');

    if (!this.sexo()) {
      return;
    }

    if (!this.idRazaSeleccionada()) {
      this.error.set('Selecciona una raza.');

      return;
    }

    if (this.razaEsOtro() && !this.razaPersonalizada().trim()) {
      this.error.set('Escribe la raza en el campo "Otro".');

      return;
    }

    if (
      !this.nombre().trim() ||
      !this.fechaNacimiento() ||
      !this.altura() ||
      !this.color().trim() ||
      !this.ubicacion().trim() ||
      !this.descripcion().trim()
    ) {
      this.error.set('Todos los campos son obligatorios.');

      return;
    }

    /*
      El precio se muestra únicamente
      para Caballo.

      Todavía NO se envía al backend,
      porque el backend actual no tiene
      ese campo.
    */

    this.enviando.set(true);

    const base = {
      nombre: this.nombre().trim(),

      sexo: this.sexo()!,

      fecha_nacimiento: this.fechaNacimiento(),

      altura: this.altura()!,

      color: this.color().trim(),

      ubicacion: this.ubicacion().trim(),

      descripcion: this.descripcion().trim(),

      disponibilidad: this.disponibilidad(),
    };

    const datos = this.razaEsOtro()
      ? {
          ...base,

          raza_personalizada: this.razaPersonalizada().trim(),
        }
      : {
          ...base,

          id_raza: this.idRazaSeleccionada()!,
        };

    this.caballoService.crear(datos).subscribe({
      next: () => {
        this.router.navigate(['/marketplace']);
      },

      error: () => {
        this.enviando.set(false);

        this.error.set('No se pudo guardar la publicación. Intenta de nuevo.');
      },
    });
  }
}
