import { Component, computed, inject, signal } from '@angular/core';

import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';

import { ActivatedRoute, Router } from '@angular/router';

import { CaballoService, PublicacionDetalle } from '../../../Services/caballo.service';

@Component({
  selector: 'app-detalle-publicacion',
  standalone: true,

  imports: [CommonModule, CurrencyPipe, DatePipe],

  templateUrl: './detalle-publicacion.component.html',

  styleUrl: './detalle-publicacion.component.css',
})
export class DetallePublicacionComponent {
  private route = inject(ActivatedRoute);

  private router = inject(Router);

  private caballoService = inject(CaballoService);

  publicacion = signal<PublicacionDetalle | null>(null);

  cargando = signal(true);

  error = signal('');

  fotoActiva = signal(0);

  // Edad calculada a partir de la fecha de nacimiento
  edad = computed(() => {
    const p = this.publicacion();

    if (!p) {
      return '';
    }

    const nacimiento = new Date(p.fecha_nacimiento);
    const hoy = new Date();

    let anios = hoy.getFullYear() - nacimiento.getFullYear();
    let meses = hoy.getMonth() - nacimiento.getMonth();

    if (meses < 0) {
      anios--;
      meses += 12;
    }

    if (anios === 0) {
      return `${meses} mes${meses === 1 ? '' : 'es'}`;
    }

    return `${anios} año${anios === 1 ? '' : 's'}${
      meses > 0 ? `, ${meses} mes${meses === 1 ? '' : 'es'}` : ''
    }`;
  });

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    if (!id) {
      this.error.set('Publicación no válida.');
      this.cargando.set(false);
      return;
    }

    this.caballoService.obtenerPublicacion(id).subscribe({
      next: (p) => {
        this.publicacion.set(p);
        this.cargando.set(false);

        // Poner como activa la foto principal si existe
        const indicePrincipal = p.fotos.findIndex((f) => f.es_principal);

        this.fotoActiva.set(indicePrincipal >= 0 ? indicePrincipal : 0);
      },

      error: (err) => {
        console.error('Error cargando publicación:', err);

        this.error.set('No se pudo cargar la publicación.');
        this.cargando.set(false);
      },
    });
  }

  volver(): void {
    this.router.navigate(['/marketplace']);
  }

  cambiarFoto(index: number): void {
    this.fotoActiva.set(index);
  }

  anteriorFoto(): void {
    const p = this.publicacion();

    if (!p || p.fotos.length === 0) {
      return;
    }

    const actual = this.fotoActiva();

    this.fotoActiva.set(actual === 0 ? p.fotos.length - 1 : actual - 1);
  }

  siguienteFoto(): void {
    const p = this.publicacion();

    if (!p || p.fotos.length === 0) {
      return;
    }

    const actual = this.fotoActiva();

    this.fotoActiva.set(actual === p.fotos.length - 1 ? 0 : actual + 1);
  }

  toggleFavorito(): void {
    const p = this.publicacion();

    if (!p) {
      return;
    }

    const accion = p.es_favorita
      ? this.caballoService.quitarFavorito(p.id_caballo)
      : this.caballoService.agregarFavorito(p.id_caballo);

    accion.subscribe({
      next: () => {
        this.publicacion.set({
          ...p,
          es_favorita: !p.es_favorita,
        });
      },

      error: (err) => {
        console.error('Error al cambiar favorito:', err);
      },
    });
  }

  chatearConVendedor(): void {
    // TODO: implementar chat
    console.log('Chatear con el vendedor — pendiente');
  }
}
