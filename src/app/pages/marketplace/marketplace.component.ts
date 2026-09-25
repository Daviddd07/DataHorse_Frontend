import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

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

// Componente de solo maqueta: los datos son fijos y el filtrado es local,
// no hay llamadas al backend. Reemplaza `nombreUsuario` y `caballos` cuando
// conectes esto con el login y con GET /publicaciones.
@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './marketplace.component.html',
  styleUrl: './marketplace.component.css',
})
export class MarketplaceComponent {
  nombreUsuario = signal('David');
  inicial = computed(() => this.nombreUsuario().charAt(0).toUpperCase());

  categorias = ['Todos', 'En venta', 'Compatibilidad', 'Pedigrí', 'Favoritos'];
  categoriaActiva = signal('Todos');

  razas = ['Criollo', 'Paso Fino', 'Cuarto de Milla', 'Andaluz', 'Pura Sangre'];
  razasSeleccionadas = signal<string[]>([]);
  soloVerificados = signal(false);
  precioMax = signal(60_000_000);

  caballos = signal<CaballoMock[]>([
    {
      id: 1,
      nombre: 'Relámpago',
      raza: 'Criollo',
      sexo: 'Macho',
      ubicacion: 'Fusagasugá, Cundinamarca',
      precio: 18_500_000,
      calificacion: 4.8,
      verificado: true,
      color: 'linear-gradient(135deg, #1E2530, #3E5C76)',
    },
    {
      id: 2,
      nombre: 'Estrella',
      raza: 'Paso Fino',
      sexo: 'Hembra',
      ubicacion: 'Chía, Cundinamarca',
      precio: 24_000_000,
      calificacion: 4.6,
      verificado: true,
      color: 'linear-gradient(135deg, #3E5C76, #6E8CA6)',
    },
    {
      id: 3,
      nombre: 'Trueno',
      raza: 'Cuarto de Milla',
      sexo: 'Macho',
      ubicacion: 'Girardot, Cundinamarca',
      precio: 32_000_000,
      calificacion: 4.9,
      verificado: false,
      color: 'linear-gradient(135deg, #4A5568, #7B8794)',
    },
    {
      id: 4,
      nombre: 'Luna',
      raza: 'Andaluz',
      sexo: 'Hembra',
      ubicacion: 'Ibagué, Tolima',
      precio: 45_000_000,
      calificacion: 5,
      verificado: true,
      color: 'linear-gradient(135deg, #1E2530, #4A5568)',
    },
    {
      id: 5,
      nombre: 'Fuego',
      raza: 'Pura Sangre',
      sexo: 'Macho',
      ubicacion: 'Bogotá D.C.',
      precio: 58_000_000,
      calificacion: 4.7,
      verificado: false,
      color: 'linear-gradient(135deg, #C97A2B, #E0A867)',
    },
    {
      id: 6,
      nombre: 'Aurora',
      raza: 'Criollo',
      sexo: 'Hembra',
      ubicacion: 'Melgar, Tolima',
      precio: 15_900_000,
      calificacion: 4.5,
      verificado: true,
      color: 'linear-gradient(135deg, #6E8CA6, #3E5C76)',
    },
  ]);

  destacado = computed(() => this.caballos()[3]);

  caballosFiltrados = computed(() => {
    const razas = this.razasSeleccionadas();
    const soloVerif = this.soloVerificados();
    const max = this.precioMax();
    const destacadoId = this.destacado().id;

    return this.caballos()
      .filter((c) => c.id !== destacadoId)
      .filter((c) => razas.length === 0 || razas.includes(c.raza))
      .filter((c) => !soloVerif || c.verificado)
      .filter((c) => c.precio <= max);
  });

  toggleRaza(raza: string): void {
    const actuales = this.razasSeleccionadas();
    this.razasSeleccionadas.set(
      actuales.includes(raza) ? actuales.filter((r) => r !== raza) : [...actuales, raza],
    );
  }
}
