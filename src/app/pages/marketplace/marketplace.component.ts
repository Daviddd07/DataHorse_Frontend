import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../Services/auth.service';

interface CaballoMock {
  id: number;
  nombre: string;
  raza: string;
  sexo: 'Macho' | 'Hembra';
  ubicacion: string;
  precio: number;
  calificacion: number;
  verificado: boolean;
  color: string;
}

// Componente de solo maqueta: el nombre viene de GET /auth/me (sesión real),
// pero las publicaciones todavía no existen en la base de datos, así que la
// lista queda vacía hasta que conectemos GET /publicaciones.
@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './marketplace.component.html',
  styleUrl: './marketplace.component.css',
})
export class MarketplaceComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  nombreUsuario = signal('');
  inicial = computed(() => this.nombreUsuario().charAt(0).toUpperCase() || '?');

  categorias = ['Todos', 'En venta', 'Compatibilidad', 'Pedigrí', 'Favoritos'];
  categoriaActiva = signal('Todos');

  razas = ['Criollo', 'Paso Fino', 'Cuarto de Milla', 'Andaluz', 'Pura Sangre'];
  razasSeleccionadas = signal<string[]>([]);
  soloVerificados = signal(false);
  precioMax = signal(60_000_000);

  // Sin publicaciones todavía: esto se llena cuando exista GET /publicaciones.
  caballos = signal<CaballoMock[]>([]);

  destacado = computed(() => this.caballos()[0]);

  caballosFiltrados = computed(() => {
    const razas = this.razasSeleccionadas();
    const soloVerif = this.soloVerificados();
    const max = this.precioMax();
    const destacado = this.destacado();

    return this.caballos()
      .filter((c) => !destacado || c.id !== destacado.id)
      .filter((c) => razas.length === 0 || razas.includes(c.raza))
      .filter((c) => !soloVerif || c.verificado)
      .filter((c) => c.precio <= max);
  });

  constructor() {
    this.auth.me().subscribe({
      next: (usuario) => {
        const primerNombre = usuario.nombre.trim().split(/\s+/)[0];
        this.nombreUsuario.set(primerNombre);
      },
      error: () => {
        // El guard ya debería haber redirigido a /login si no hay sesión;
        // esto es solo un respaldo por si /me falla después de entrar.
        this.nombreUsuario.set('');
      },
    });
  }

  toggleRaza(raza: string): void {
    const actuales = this.razasSeleccionadas();
    this.razasSeleccionadas.set(
      actuales.includes(raza) ? actuales.filter((r) => r !== raza) : [...actuales, raza],
    );
  }

  agregarPublicacion(): void {
    this.router.navigate(['/publicaciones/nueva']);
  }
}
