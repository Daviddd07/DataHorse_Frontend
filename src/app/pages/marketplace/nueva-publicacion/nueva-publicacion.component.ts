import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CaballoService, Raza } from '../../../Services/caballo.service';

type Paso = 'tipo' | 'formulario';

@Component({
  selector: 'app-nueva-publicacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './nueva-publicacion.component.html',
  styleUrl: './nueva-publicacion.component.css',
})
export class NuevaPublicacionComponent {
  private caballoService = inject(CaballoService);
  private router = inject(Router);

  paso = signal<Paso>('tipo');
  sexo = signal<'Macho' | 'Hembra' | null>(null);

  razas = signal<Raza[]>([]);
  idRazaSeleccionada = signal<number | null>(null);
  razaEsOtro = computed(() => this.idRazaSeleccionada() === -1);
  razaPersonalizada = signal('');

  nombre = signal('');
  fechaNacimiento = signal('');
  altura = signal<number | null>(null);
  color = signal('');
  ubicacion = signal('');
  descripcion = signal('');
  disponibilidad = signal<'Disponible' | 'No disponible'>('Disponible');

  enviando = signal(false);
  error = signal('');

  constructor() {
    this.caballoService.listarRazas().subscribe({
      next: (razas) => this.razas.set(razas),
      error: () => this.razas.set([]),
    });
  }

  // Paso 1: elegir Yegua (Hembra) o Caballo (Macho)
  elegirTipo(sexo: 'Macho' | 'Hembra'): void {
    this.sexo.set(sexo);
    this.paso.set('formulario');
  }

  volver(): void {
    this.paso.set('tipo');
  }

  onRazaChange(valor: string): void {
    this.idRazaSeleccionada.set(valor ? +valor : null);
  }

  onDisponibilidadChange(valor: string): void {
    this.disponibilidad.set(valor as 'Disponible' | 'No disponible');
  }

  cancelar(): void {
    this.router.navigate(['/marketplace']);
  }

  guardar(): void {
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
      ? { ...base, raza_personalizada: this.razaPersonalizada().trim() }
      : { ...base, id_raza: this.idRazaSeleccionada()! };

    this.caballoService.crear(datos).subscribe({
      next: () => this.router.navigate(['/marketplace']),
      error: () => {
        this.enviando.set(false);
        this.error.set('No se pudo guardar la publicación. Intenta de nuevo.');
      },
    });
  }
}
