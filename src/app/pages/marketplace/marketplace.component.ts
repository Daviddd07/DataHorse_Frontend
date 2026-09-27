import { Component, computed, inject, signal } from '@angular/core';

import { CommonModule, CurrencyPipe } from '@angular/common';

import { Router } from '@angular/router';

import { AuthService } from '../../Services/auth.service';

import { CaballoService, Publicacion } from '../../Services/caballo.service';

interface CaballoMarketplace {
  id: number;

  idCaballo: number;

  nombre: string;

  raza: string;

  sexo: 'Macho' | 'Hembra';

  ubicacion: string;

  precio: number | null;

  colorReal: string;

  descripcion: string;

  disponibilidad: string;

  propietario: string;

  esMia: boolean;

  esFavorito: boolean;

  verificado: boolean;

  calificacion: number;

  fondo: string;

  // 👇 NUEVO: la ruta completa de la foto principal (o null)
  fotoPrincipal: string | null;
}

@Component({
  selector: 'app-marketplace',

  standalone: true,

  imports: [CommonModule, CurrencyPipe],

  templateUrl: './marketplace.component.html',

  styleUrl: './marketplace.component.css',
})
export class MarketplaceComponent {
  private auth = inject(AuthService);

  private caballoService = inject(CaballoService);

  private router = inject(Router);

  nombreUsuario = signal('');

  inicial = computed(() => this.nombreUsuario().charAt(0).toUpperCase() || '?');

  busqueda = signal('');

  categorias = ['Todos', 'En venta', 'Compatibilidad', 'Pedigrí', 'Favoritos'];

  categoriaActiva = signal('Todos');

  razasSeleccionadas = signal<string[]>([]);

  soloVerificados = signal(false);

  precioMax = signal(60_000_000);

  caballos = signal<CaballoMarketplace[]>([]);

  cargando = signal(true);

  error = signal('');

  // ======================================================
  // RAZAS DISPONIBLES
  // ======================================================

  razas = computed(() => {
    const nombres = this.caballos()

      .map((caballo) => caballo.raza)

      .filter((raza) => raza.trim().length > 0);

    return [...new Set(nombres)].sort();
  });

  // ======================================================
  // FILTRADO
  // ======================================================

  publicacionesFiltradas = computed(() => {
    const razas = this.razasSeleccionadas();

    const soloVerificados = this.soloVerificados();

    const precioMaximo = this.precioMax();

    const texto = this.busqueda().trim().toLowerCase();

    const categoria = this.categoriaActiva();

    return this.caballos()

      .filter((caballo) => {
        if (!texto) {
          return true;
        }

        return (
          caballo.nombre.toLowerCase().includes(texto) ||
          caballo.raza.toLowerCase().includes(texto) ||
          caballo.ubicacion.toLowerCase().includes(texto)
        );
      })

      .filter((caballo) => razas.length === 0 || razas.includes(caballo.raza))

      .filter((caballo) => !soloVerificados || caballo.verificado)

      .filter((caballo) => caballo.precio === null || caballo.precio <= precioMaximo)

      .filter((caballo) => {
        if (categoria === 'Favoritos') {
          return caballo.esFavorito;
        }

        if (categoria === 'En venta') {
          return caballo.disponibilidad === 'Disponible';
        }

        if (categoria === 'Pedigrí') {
          return caballo.verificado;
        }

        return true;
      });
  });

  // ======================================================
  // PUBLICACIÓN DESTACADA
  // ======================================================

  destacado = computed(() => {
    return this.publicacionesFiltradas()[0];
  });

  // ======================================================
  // RESTO DE PUBLICACIONES
  // ======================================================

  caballosFiltrados = computed(() => {
    const destacado = this.destacado();

    return this.publicacionesFiltradas()

      .filter((caballo) => !destacado || caballo.id !== destacado.id);
  });

  // ======================================================
  // CONSTRUCTOR
  // ======================================================

  constructor() {
    this.cargarUsuario();

    this.cargarPublicaciones();
  }

  // ======================================================
  // CARGAR USUARIO
  // ======================================================

  private cargarUsuario(): void {
    this.auth.me().subscribe({
      next: (usuario) => {
        const primerNombre = usuario.nombre.trim().split(/\s+/)[0];

        this.nombreUsuario.set(primerNombre);
      },

      error: (err) => {
        console.error('Error cargando usuario:', err);

        this.nombreUsuario.set('');
      },
    });
  }

  // ======================================================
  // CARGAR PUBLICACIONES
  // ======================================================

  private cargarPublicaciones(): void {
    this.cargando.set(true);

    this.error.set('');

    this.caballoService.listarPublicaciones().subscribe({
      next: (publicaciones: Publicacion[]) => {
        const convertidas: CaballoMarketplace[] = publicaciones.map((p) => {
          const caballo: CaballoMarketplace = {
            id: p.id_publicacion,

            idCaballo: p.id_caballo,

            nombre: p.nombre,

            raza: p.raza,

            sexo: p.sexo,

            ubicacion: p.ubicacion,

            precio: p.precio,

            colorReal: p.color,

            descripcion: p.descripcion,

            disponibilidad: p.disponibilidad,

            propietario: p.propietario,

            esMia: p.es_mia,

            esFavorito: p.es_favorita,

            verificado: false,

            calificacion: 0,

            fondo:
              p.sexo === 'Macho'
                ? 'linear-gradient(135deg, #ddd8ff 0%, #c6d5ff 100%)'
                : 'linear-gradient(135deg, #f7d9ee 0%, #ded7ff 100%)',

            // 👇 NUEVO: construimos la URL completa de la foto
            fotoPrincipal: p.foto_principal ? `http://localhost:8000${p.foto_principal}` : null,
          };

          return caballo;
        });

        this.caballos.set(convertidas);

        this.cargando.set(false);
      },

      error: (err) => {
        console.error('Error cargando publicaciones:', err);

        this.error.set('No se pudieron cargar las publicaciones.');

        this.caballos.set([]);

        this.cargando.set(false);
      },
    });
  }

  // ======================================================
  // FAVORITO
  // ======================================================

  toggleFavorito(caballo: CaballoMarketplace): void {
    if (caballo.esFavorito) {
      this.caballoService.quitarFavorito(caballo.idCaballo).subscribe({
        next: () => {
          this.actualizarFavorito(caballo.idCaballo, false);
        },

        error: (err) => {
          console.error('Error quitando favorito:', err);
        },
      });
    } else {
      this.caballoService.agregarFavorito(caballo.idCaballo).subscribe({
        next: () => {
          this.actualizarFavorito(caballo.idCaballo, true);
        },

        error: (err) => {
          console.error('Error agregando favorito:', err);
        },
      });
    }
  }

  // ======================================================
  // ACTUALIZAR FAVORITO LOCALMENTE
  // ======================================================

  private actualizarFavorito(idCaballo: number, favorito: boolean): void {
    this.caballos.update((actuales) =>
      actuales.map((caballo) =>
        caballo.idCaballo === idCaballo
          ? {
              ...caballo,

              esFavorito: favorito,
            }
          : caballo,
      ),
    );
  }

  // ======================================================
  // FILTRO POR RAZA
  // ======================================================

  toggleRaza(raza: string): void {
    const actuales = this.razasSeleccionadas();

    this.razasSeleccionadas.set(
      actuales.includes(raza) ? actuales.filter((r) => r !== raza) : [...actuales, raza],
    );
  }

  // ======================================================
  // NUEVA PUBLICACIÓN
  // ======================================================

  agregarPublicacion(): void {
    this.router.navigate(['/publicaciones/nueva']);
  }
  // ======================================================
  // IR AL DETALLE DE LA PUBLICACIÓN
  // ======================================================

  irADetalle(caballo: CaballoMarketplace): void {
    this.router.navigate(['/publicaciones', caballo.id]);
  }
}
