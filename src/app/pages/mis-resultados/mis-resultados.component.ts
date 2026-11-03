import { Component, inject, signal } from '@angular/core';

import { DatePipe } from '@angular/common';

import { Router } from '@angular/router';

import { CompatibilidadService, ResumenEstudio } from '../../Services/compatibilidad.service';

@Component({
  selector: 'app-mis-resultados',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './mis-resultados.component.html',
  // Comparte el estilo de la página de resultados (fondo, paneles y botones)
  styleUrls: [
    '../compatibilidad-resultado/compatibilidad-resultado.component.css',
    './mis-resultados.component.css',
  ],
})
export class MisResultadosComponent {
  private readonly compatibilidad = inject(CompatibilidadService);
  private readonly router = inject(Router);

  estudios = signal<ResumenEstudio[]>([]);
  cargando = signal(true);
  error = signal('');

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    this.compatibilidad.listarMisResultados().subscribe({
      next: (estudios) => {
        this.estudios.set(estudios);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No fue posible cargar tus estudios. Intenta de nuevo.');
        this.cargando.set(false);
      },
    });
  }

  // Mismos umbrales de color que la página de resultados
  nivel(puntos: number): 'alto' | 'medio' | 'bajo' {
    if (puntos >= 75) return 'alto';
    if (puntos >= 50) return 'medio';
    return 'bajo';
  }

  abrir(estudio: ResumenEstudio): void {
    void this.router.navigate(['/compatibilidad/resultados', estudio.id_solicitud]);
  }

  nuevoEstudio(): void {
    void this.router.navigate(['/marketplace'], { queryParams: { categoria: 'Compatibilidad' } });
  }

  volverAlMarketplace(): void {
    void this.router.navigate(['/marketplace']);
  }
}
