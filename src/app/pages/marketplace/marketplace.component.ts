import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../Services/auth.service';
import { CaballoService, PublicacionListItem } from '../../Services/caballo.service';

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
  fotoPrincipal: string | null;
}

// El nombre viene de GET /auth/me (sesión real), y las publicaciones ahora
// vienen de GET /api/v1/caballos. El backend no tiene calificacion ni
// verificado (no existen en la BD), así que quedan en 0 / false por ahora.
@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './marketplace.component.html',
  styleUrl: './marketplace.component.css',
})
export class MarketplaceComponent {
  private auth = inject(AuthService);
  private caballoService = inject(CaballoService);
  private router = inject(Router);

  nombreUsuario = signal('');
  inicial = computed(() => this.nombreUsuario().charAt(0).toUpperCase() || '?');

  categorias = ['Todos', 'En venta', 'Compatibilidad', 'Pedigrí', 'Favoritos'];
  categoriaActiva = signal('Todos');

  // Catálogo de razas del backend (GET /api/v1/razas)
  razas = signal<string[]>([]);
  razasSeleccionadas = signal<string[]>([]);
  soloVerificados = signal(false);
  precioMax = signal(60_000_000);

  caballos = signal<CaballoMock[]>([]);

  // El destacado es el primer caballo que pasa los filtros del sidebar.
  destacado = computed(() => this.aplicarFiltros()[0]);

  // La lista son los filtrados, sin incluir al que ya se muestra como destacado.
  caballosFiltrados = computed(() =>
    this.aplicarFiltros().filter((c) => c.id !== this.destacado()?.id),
  );

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

    // Catálogo de razas para el filtro lateral (viene de la BD)
    this.caballoService.listarRazas().subscribe({
      next: (razas) => this.razas.set(razas.map((r) => r.nombre)),
      error: () => this.razas.set([]),
    });

    // GET /api/v1/caballos ya devuelve el nombre de la raza y el precio de
    // referencia directamente (join hecho en el backend), no hace falta
    // traducir un id_raza aquí.
    this.caballoService.listar().subscribe({
      next: (publicaciones: PublicacionListItem[]) => {
        const mapeados: CaballoMock[] = publicaciones.map((p: PublicacionListItem) => ({
          id: p.id_publicacion,
          nombre: p.nombre,
          raza: p.raza,
          sexo: p.sexo as 'Macho' | 'Hembra',
          ubicacion: p.ubicacion,
          precio: p.precio_referencia,
          calificacion: 0,
          verificado: false,
          color: 'var(--dh-purple)',
          fotoPrincipal: p.foto_principal ? `http://localhost:8000${p.foto_principal}` : null,
        }));
        this.caballos.set(mapeados);
      },
      error: () => this.caballos.set([]),
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

  /**
   * Aplica TODOS los filtros del sidebar a la lista completa de caballos.
   * Se usa tanto para `destacado` como para `caballosFiltrados`, así el
   * destacado respeta los filtros (Opción A) y la lista no lo duplica.
   */
  private aplicarFiltros(): CaballoMock[] {
    const razas = this.razasSeleccionadas();
    const soloVerif = this.soloVerificados();
    const max = this.precioMax();

    return this.caballos()
      .filter((c) => razas.length === 0 || razas.includes(c.raza))
      .filter((c) => !soloVerif || c.verificado)
      .filter((c) => c.precio <= max);
  }
}
