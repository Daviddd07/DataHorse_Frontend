import { Component, computed, inject, signal } from '@angular/core';

import { CommonModule, CurrencyPipe } from '@angular/common';

import { Router } from '@angular/router';

import { AuthService } from '../../Services/auth.service';

import { CaballoService, CaballoMio } from '../../Services/caballo.service';

import { environment } from '../../../environments/environment';

interface CaballoVista extends CaballoMio {
  fotoUrl: string | null;
}

@Component({
  selector: 'app-mis-caballos',
  standalone: true,

  imports: [CommonModule, CurrencyPipe],

  templateUrl: './mis-caballos.component.html',

  styleUrl: './mis-caballos.component.css',
})
export class MisCaballosComponent {
  private readonly auth = inject(AuthService);

  private readonly caballoService = inject(CaballoService);

  private readonly router = inject(Router);

  nombreUsuario = signal('');

  correoUsuario = signal('');

  inicial = computed(() => this.nombreUsuario().charAt(0).toUpperCase() || '?');

  cargando = signal(true);

  error = signal('');

  caballos = signal<CaballoVista[]>([]);

  menuAbierto = signal(false);

  modalEliminarAbierto = signal(false);

  caballoAEliminar = signal<CaballoVista | null>(null);
  // ======================================================
  // Separar por sexo
  machos = computed(() => this.caballos().filter((c) => c.sexo === 'Macho'));

  hembras = computed(() => this.caballos().filter((c) => c.sexo === 'Hembra'));

  constructor() {
    this.cargarUsuario();
    this.cargarCaballos();
  }

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

  private cargarCaballos(): void {
    this.cargando.set(true);
    this.error.set('');

    this.caballoService.listarMisCaballos().subscribe({
      next: (data) => {
        const convertidos: CaballoVista[] = data.map((c) => ({
          ...c,
          fotoUrl: c.foto_principal ? `${environment.uploadsUrl}${c.foto_principal}` : null,
        }));

        this.caballos.set(convertidos);
        this.cargando.set(false);
      },

      error: (err) => {
        console.error('Error cargando mis caballos:', err);
        this.error.set('No se pudieron cargar tus caballos.');
        this.caballos.set([]);
        this.cargando.set(false);
      },
    });
  }

  volverAlMarketplace(): void {
    void this.router.navigate(['/marketplace']);
  }

  publicarCaballo(): void {
    void this.router.navigate(['/publicaciones/nueva']);
  }

  editarCaballo(caballo: CaballoVista): void {
    void this.router.navigate(['/mis-caballos/editar', caballo.id_caballo]);
  }

  eliminarCaballo(caballo: CaballoVista): void {
    this.caballoAEliminar.set(caballo);
    this.modalEliminarAbierto.set(true);
  }

  cancelarEliminarCaballo(): void {
    this.caballoAEliminar.set(null);
    this.modalEliminarAbierto.set(false);
  }

  confirmarEliminarCaballo(): void {
    const caballo = this.caballoAEliminar();

    if (!caballo) {
      return;
    }

    this.caballoService.eliminarCaballo(caballo.id_caballo).subscribe({
      next: () => {
        // Quitar de la lista local sin recargar todo
        this.caballos.update((actuales) =>
          actuales.filter((c) => c.id_caballo !== caballo.id_caballo),
        );

        this.modalEliminarAbierto.set(false);
        this.caballoAEliminar.set(null);
      },

      error: (err) => {
        console.error('Error eliminando caballo:', err);

        this.modalEliminarAbierto.set(false);
        this.caballoAEliminar.set(null);

        this.error.set('No se pudo eliminar el caballo. Intenta de nuevo.');
      },
    });
  }

  toggleMenu(): void {
    this.menuAbierto.update((v) => !v);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  irAMisCaballos(): void {
    this.menuAbierto.set(false);
    void this.router.navigate(['/mis-caballos']);
  }

  cerrarSesion(): void {
    this.menuAbierto.set(false);

    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
