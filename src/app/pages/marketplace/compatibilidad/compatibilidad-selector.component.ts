import { Component, computed, inject, input, signal } from '@angular/core';

import { Router } from '@angular/router';

import { CaballoService } from '../../../Services/caballo.service';

import {
  CompatibilidadService,
  CupoCompatibilidad,
} from '../../../Services/compatibilidad.service';

import { CupoCompatibilidadComponent } from '../../../components/cupo-compatibilidad/cupo-compatibilidad.component';

import { LogoIaComponent } from '../../../components/logo-ia/logo-ia.component';

import { environment } from '../../../../environments/environment';

// Lo que necesita el selector de cada tarjeta del marketplace
export interface CaballoElegible {
  idCaballo: number;
  nombre: string;
  raza: string;
  sexo: 'Macho' | 'Hembra';
  ubicacion: string;
  propietario: string;
  esMia: boolean;
  fotoPrincipal: string | null;
  fondo: string;
  edad: number; // años
  altura: number; // metros
}

export interface YeguaElegible {
  idCaballo: number;
  nombre: string;
  raza: string;
  ubicacion: string;
  fotoPrincipal: string | null;
  edad: number; // años
  altura: number; // metros
}

// Años cumplidos a partir de 'YYYY-MM-DD'
export function edadEnAnios(fechaNacimiento: string, hoy = new Date()): number {
  const nacimiento = new Date(`${fechaNacimiento}T00:00:00`);
  if (Number.isNaN(nacimiento.getTime())) return 0;

  let anios = hoy.getFullYear() - nacimiento.getFullYear();
  const aunNoCumple =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (aunNoCumple) anios--;

  return Math.max(anios, 0);
}

type Paso = 1 | 2 | 3;

@Component({
  selector: 'app-compatibilidad-selector',
  standalone: true,
  imports: [CupoCompatibilidadComponent, LogoIaComponent],
  templateUrl: './compatibilidad-selector.component.html',
  styleUrl: './compatibilidad-selector.component.css',
})
export class CompatibilidadSelectorComponent {
  private readonly caballoService = inject(CaballoService);
  private readonly compatibilidad = inject(CompatibilidadService);
  private readonly router = inject(Router);

  // Caballos del marketplace (ya filtrados por la búsqueda)
  caballos = input<CaballoElegible[]>([]);

  machos = computed(() => this.caballos().filter((c) => c.sexo === 'Macho'));

  readonly pasos: { numero: Paso; etiqueta: string }[] = [
    { numero: 1, etiqueta: 'Caballo' },
    { numero: 2, etiqueta: 'Tu yegua' },
    { numero: 3, etiqueta: 'Estudio' },
  ];

  // Lo que evalúa el modelo (se muestra antes de lanzar el estudio)
  readonly factoresIa = ['Raza', 'Edad y madurez', 'Altura', 'Ubicación', 'Descendencia'];

  paso = signal<Paso>(1);

  caballoSeleccionado = signal<CaballoElegible | null>(null);
  caballoConfirmado = signal<CaballoElegible | null>(null);

  yeguas = signal<YeguaElegible[]>([]);
  cargandoYeguas = signal(false);
  errorYeguas = signal('');
  yeguaSeleccionada = signal<YeguaElegible | null>(null);
  yeguaConfirmada = signal<YeguaElegible | null>(null);

  cupo = signal<CupoCompatibilidad | null>(null);

  constructor() {
    this.compatibilidad.obtenerCupo().subscribe({
      next: (cupo) => this.cupo.set(cupo),
      error: () => this.cupo.set(null),
    });
  }

  // ======================================================
  // PASO 1: CABALLO DEL MARKETPLACE
  // ======================================================

  seleccionarCaballo(caballo: CaballoElegible): void {
    this.caballoSeleccionado.set(caballo);
  }

  confirmarCaballo(): void {
    const caballo = this.caballoSeleccionado();
    if (!caballo) return;

    this.caballoConfirmado.set(caballo);
    this.paso.set(2);

    if (this.yeguas().length === 0) this.cargarYeguas();
  }

  // ======================================================
  // PASO 2: YEGUA DEL USUARIO
  // ======================================================

  private cargarYeguas(): void {
    this.cargandoYeguas.set(true);
    this.errorYeguas.set('');

    this.caballoService.listarMisCaballos().subscribe({
      next: (mios) => {
        this.yeguas.set(
          mios
            .filter((c) => c.sexo === 'Hembra')
            .map((c) => ({
              idCaballo: c.id_caballo,
              nombre: c.nombre,
              raza: c.raza,
              ubicacion: c.ubicacion,
              fotoPrincipal: c.foto_principal
                ? `${environment.uploadsUrl}${c.foto_principal}`
                : null,
              edad: edadEnAnios(c.fecha_nacimiento),
              altura: c.altura,
            })),
        );
        this.cargandoYeguas.set(false);
      },
      error: () => {
        this.errorYeguas.set('No fue posible cargar tus yeguas. Intenta de nuevo.');
        this.cargandoYeguas.set(false);
      },
    });
  }

  reintentarYeguas(): void {
    this.cargarYeguas();
  }

  seleccionarYegua(yegua: YeguaElegible): void {
    this.yeguaSeleccionada.set(yegua);
  }

  confirmarYegua(): void {
    const yegua = this.yeguaSeleccionada();
    if (!yegua) return;

    this.yeguaConfirmada.set(yegua);
    this.paso.set(3);
  }

  registrarYegua(): void {
    void this.router.navigate(['/publicaciones/nueva']);
  }

  // ======================================================
  // PASO 3: CONFIRMAR Y ABRIR EL ESTUDIO
  // ======================================================

  realizarEstudio(): void {
    const caballo = this.caballoConfirmado();
    const yegua = this.yeguaConfirmada();
    if (!caballo || !yegua) return;

    void this.router.navigate(['/compatibilidad', caballo.idCaballo, yegua.idCaballo]);
  }

  // ======================================================
  // NAVEGACIÓN ENTRE PASOS
  // ======================================================

  irAPaso(paso: Paso): void {
    // Solo se puede volver a pasos ya completados
    if (paso < this.paso()) this.paso.set(paso);
  }
}
