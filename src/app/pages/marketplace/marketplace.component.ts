import { Component, computed, inject, signal } from '@angular/core';

import { CommonModule, CurrencyPipe } from '@angular/common';

import { Router } from '@angular/router';

import { AuthService } from '../../Services/auth.service';

import { CaballoService, Publicacion } from '../../Services/caballo.service';

import { environment } from '../../../environments/environment';

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

  // NUEVO: la ruta completa de la foto principal (o null)
  fotoPrincipal: string | null;

  edad: number;

  altura: number;

  lat: number | null;
  lng: number | null;
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

  categorias = ['Todos', 'Edad', 'Altura', 'Proximidad', 'Compatibilidad', 'Pedigrí'];

  categoriaActiva = signal('Todos');

  razasSeleccionadas = signal<string[]>([]);

  soloVerificados = signal(false);

  precioMax = signal(60_000_000);

  edadMax = signal(20); // años

  caballos = signal<CaballoMarketplace[]>([]);

  cargando = signal(true);

  menuAbierto = signal(false);

  correoUsuario = signal('');

  error = signal('');

  alturaAscendente = signal(false);

  filtrosAbiertos = signal(false);

  edadAscendente = signal(true);

  toggleFiltros() {
    this.filtrosAbiertos.update((v) => !v);
  }
  // ======================================================
  // RAZAS DISPONIBLES
  // ======================================================

  razas = signal<string[]>([]);

  // NUEVAS SEÑALES PARA PROXIMIDAD
  radioMax = signal(50); // 50 km por defecto
  userLat = signal<number | null>(null);
  userLng = signal<number | null>(null);
  cargandoUbicacion = signal(false);
  errorUbicacion = signal('');

  // ======================================================
  // FILTRADO
  // ======================================================

  publicacionesFiltradas = computed(() => {
    const razas = this.razasSeleccionadas();
    const soloVerificados = this.soloVerificados();
    const precioMaximo = this.precioMax();
    const edadMaxima = this.edadMax();
    const texto = this.busqueda().trim().toLowerCase();
    const categoria = this.categoriaActiva();

    const filtrados = this.caballos()
      // 1. FILTRO POR BÚSQUEDA (nombre, raza, ubicación)
      .filter((caballo) => {
        if (!texto) return true;
        return (
          caballo.nombre.toLowerCase().includes(texto) ||
          caballo.raza.toLowerCase().includes(texto) ||
          caballo.ubicacion.toLowerCase().includes(texto)
        );
      })
      // 2. FILTRO POR RAZAS
      .filter((caballo) => razas.length === 0 || razas.includes(caballo.raza))
      // 3. FILTRO POR VERIFICADOS
      .filter((caballo) => !soloVerificados || caballo.verificado)
      // 4. FILTRO POR PRECIO MÁXIMO
      .filter((caballo) => caballo.precio === null || caballo.precio <= precioMaximo)
      // 5. FILTRO POR EDAD MÁXIMA
      .filter((caballo) => caballo.edad <= edadMaxima)
      // 6. FILTRO POR CATEGORÍA ACTIVA (Favoritos, Pedigrí, Proximidad)
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

        if (categoria === 'Proximidad') {
          const lat = this.userLat();
          const lng = this.userLng();

          // Si no hay ubicación, mostramos todos
          if (!lat || !lng) return true;

          // Si el caballo no tiene coordenadas, lo ocultamos
          if (!caballo.lat || !caballo.lng) return false;

          const distancia = this.calcularDistancia(lat, lng, caballo.lat, caballo.lng);
          return distancia <= this.radioMax();
        }

        return true;
      });

    // ======================================================
    // ORDENAMIENTOS
    // ======================================================

    // ORDENAR POR PROXIMIDAD
    if (categoria === 'Proximidad' && this.userLat() && this.userLng()) {
      return [...filtrados].sort((a, b) => {
        const distA = this.calcularDistancia(this.userLat()!, this.userLng()!, a.lat!, a.lng!);
        const distB = this.calcularDistancia(this.userLat()!, this.userLng()!, b.lat!, b.lng!);
        return distA - distB; // El más cercano primero
      });
    }

    // ORDENAR POR ALTURA
    if (categoria === 'Altura') {
      const ascendente = this.alturaAscendente();
      return [...filtrados].sort((a, b) =>
        ascendente ? a.altura - b.altura : b.altura - a.altura,
      );
    }

    // ORDENAR POR EDAD
    if (categoria === 'Edad') {
      const ascendente = this.edadAscendente();
      return [...filtrados].sort((a, b) => (ascendente ? a.edad - b.edad : b.edad - a.edad));
    }

    return filtrados;
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
    this.cargarRazas();
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

        this.correoUsuario.set(usuario.correo);
      },

      error: (err) => {
        console.error('Error cargando usuario:', err);

        this.nombreUsuario.set('');
      },
    });
  }

  // ======================================================
  // CARGAR RAZAS
  // ======================================================
  private cargarRazas(): void {
    this.caballoService.listarRazas().subscribe({
      next: (razas) => {
        this.razas.set(razas.map((r) => r.nombre).sort());
      },

      error: (err) => {
        console.error('Error cargando razas:', err);
        this.razas.set([]);
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

            // NUEVO: construimos la URL completa de la foto
            fotoPrincipal: p.foto_principal ? `${environment.uploadsUrl}${p.foto_principal}` : null,

            edad: this.calcularEdad(p.fecha_nacimiento),

            altura: p.altura,

            lat: p.ubicacion_lat ?? null,
            lng: p.ubicacion_lng ?? null,
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

  // ======================================================
  // MENÚ DE USUARIO
  // ======================================================

  toggleMenu(): void {
    this.menuAbierto.update((v) => !v);
  }

  irAMisCaballos(): void {
    this.menuAbierto.set(false);
    this.router.navigate(['/mis-caballos']);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  cerrarSesion(): void {
    this.auth.logout().subscribe({
      next: () => {
        this.menuAbierto.set(false);
        this.router.navigate(['/login']);
      },
      error: () => {
        // Aunque el backend falle, igual sacamos al usuario
        this.menuAbierto.set(false);
        this.router.navigate(['/login']);
      },
    });
  }
  // ======================================================
  // CALCULAR EDAD
  // ======================================================

  private calcularEdad(fechaNacimiento: string): number {
    if (!fechaNacimiento) {
      return 0;
    }

    const nacimiento = new Date(fechaNacimiento);
    const hoy = new Date();

    let edad = hoy.getFullYear() - nacimiento.getFullYear();

    const mes = hoy.getMonth() - nacimiento.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }

    return Math.max(0, edad);
  }
  // ======================================================
  // SELECCIONAR CATEGORÍA (altura)
  // ======================================================

  seleccionarCategoria(categoria: string): void {
    // Si vuelven a hacer clic en "Altura", cambiar dirección
    if (categoria === 'Altura' && this.categoriaActiva() === 'Altura') {
      this.alturaAscendente.update((v) => !v);
      return;
    }

    // Si vuelven a hacer clic en "Edad", cambiar dirección
    if (categoria === 'Edad' && this.categoriaActiva() === 'Edad') {
      this.edadAscendente.update((v) => !v);
      return;
    }

    // Si es una categoría distinta, resetear las direcciones
    if (categoria !== 'Altura') {
      this.alturaAscendente.set(false);
    }
    if (categoria !== 'Edad') {
      this.edadAscendente.set(true);
    }

    this.categoriaActiva.set(categoria);
  }
  // ======================================================
  // PROXIMIDAD (FÓRMULA DE HAVERSINE)
  // ======================================================

  pedirUbicacion(): void {
    if (!navigator.geolocation) {
      this.errorUbicacion.set('Tu navegador no soporta geolocalización.');
      return;
    }

    this.cargandoUbicacion.set(true);
    this.errorUbicacion.set('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.userLat.set(pos.coords.latitude);
        this.userLng.set(pos.coords.longitude);
        this.cargandoUbicacion.set(false);
      },
      (err) => {
        console.error('Error obteniendo ubicación:', err);
        this.errorUbicacion.set('Permiso denegado o no disponible.');
        this.cargandoUbicacion.set(false);
      },
    );
  }

  calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
