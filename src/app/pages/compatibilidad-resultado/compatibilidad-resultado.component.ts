import { Component, DestroyRef, computed, inject, signal } from '@angular/core';

import { DatePipe } from '@angular/common';

import { HttpErrorResponse } from '@angular/common/http';

import { ActivatedRoute, Router } from '@angular/router';

import {
  CompatibilidadService,
  CupoCompatibilidad,
  EvaluacionCompatibilidad,
  NivelConfianza,
} from '../../Services/compatibilidad.service';

import { CupoCompatibilidadComponent } from '../../components/cupo-compatibilidad/cupo-compatibilidad.component';

import { LogoIaComponent } from '../../components/logo-ia/logo-ia.component';

// Mensajes que rotan mientras la IA analiza (en el mismo orden en que se muestran los puntos)
export const PASOS_ANALISIS = [
  'Comparando razas y linaje…',
  'Evaluando edad y madurez reproductiva…',
  'Analizando altura y conformación…',
  'Calculando la distancia entre ubicaciones…',
  'Revisando genealogía y descendencia…',
  'Redactando recomendaciones para la cría…',
];

export const MS_POR_PASO = 1800;

const ETIQUETAS_CONFIANZA: Record<NivelConfianza, string> = {
  alta: 'Confianza alta',
  media: 'Confianza media',
  baja: 'Confianza baja',
};

@Component({
  selector: 'app-compatibilidad-resultado',
  standalone: true,
  imports: [CupoCompatibilidadComponent, DatePipe, LogoIaComponent],
  templateUrl: './compatibilidad-resultado.component.html',
  styleUrl: './compatibilidad-resultado.component.css',
})
export class CompatibilidadResultadoComponent {
  private readonly compatibilidad = inject(CompatibilidadService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly parametros = this.route.snapshot.paramMap;

  // /compatibilidad/resultados/:idSolicitud = estudio guardado (no vuelve a evaluar)
  readonly esGuardado = this.parametros.has('idSolicitud');

  private readonly idSolicitud = Number(this.parametros.get('idSolicitud'));
  private readonly idCaballo = Number(this.parametros.get('idCaballo'));
  private readonly idYegua = Number(this.parametros.get('idYegua'));

  cargando = signal(true);
  error = signal('');
  evaluacion = signal<EvaluacionCompatibilidad | null>(null);
  cupo = signal<CupoCompatibilidad | null>(null);

  pasoAnalisis = signal(PASOS_ANALISIS[0]);
  private intervaloPasos: ReturnType<typeof setInterval> | undefined;

  // Puntos por categoría, en el orden en que se muestran
  categorias = computed(() => {
    const r = this.evaluacion()?.resultado;
    if (!r) return [];

    return [
      { etiqueta: 'Raza', valor: r.raza_puntos },
      { etiqueta: 'Madurez', valor: r.madurez_puntos },
      { etiqueta: 'Altura', valor: r.altura_puntos },
      { etiqueta: 'Ubicación', valor: r.ubicacion_puntos },
      { etiqueta: 'Genealogía y salud', valor: r.otros_puntos },
    ];
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.detenerPasos());
    this.cargar();
  }

  cargar(): void {
    const ids = this.esGuardado ? [this.idSolicitud] : [this.idCaballo, this.idYegua];

    if (!ids.every((id) => this.esIdValido(id))) {
      this.error.set('El estudio solicitado no es válido.');
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    this.error.set('');
    if (!this.esGuardado) this.iniciarPasos();

    const peticion = this.esGuardado
      ? this.compatibilidad.obtenerResultado(this.idSolicitud)
      : this.compatibilidad.evaluar(this.idCaballo, this.idYegua);

    peticion.subscribe({
      next: (evaluacion) => {
        this.detenerPasos();
        this.evaluacion.set(evaluacion);
        this.cargando.set(false);
        this.actualizarCupo();
      },
      error: (e: HttpErrorResponse) => {
        this.detenerPasos();
        const detalle = e.error?.detail;
        this.error.set(
          typeof detalle === 'string'
            ? detalle
            : 'No fue posible realizar el estudio. Intenta de nuevo.',
        );
        this.cargando.set(false);
        this.actualizarCupo();
      },
    });
  }

  // Rota los mensajes de lo que la IA está evaluando; el último se queda fijo si tarda más
  private iniciarPasos(): void {
    this.detenerPasos();
    let indice = 0;
    this.pasoAnalisis.set(PASOS_ANALISIS[0]);

    this.intervaloPasos = setInterval(() => {
      indice = Math.min(indice + 1, PASOS_ANALISIS.length - 1);
      this.pasoAnalisis.set(PASOS_ANALISIS[indice]);
      if (indice === PASOS_ANALISIS.length - 1) this.detenerPasos();
    }, MS_POR_PASO);
  }

  private detenerPasos(): void {
    clearInterval(this.intervaloPasos);
    this.intervaloPasos = undefined;
  }

  private actualizarCupo(): void {
    this.compatibilidad.obtenerCupo().subscribe({
      next: (cupo) => this.cupo.set(cupo),
      error: () => this.cupo.set(null),
    });
  }

  private esIdValido(id: number): boolean {
    return Number.isInteger(id) && id > 0;
  }

  // ======================================================
  // PRESENTACIÓN
  // ======================================================

  etiquetaConfianza(nivel: NivelConfianza): string {
    return ETIQUETAS_CONFIANZA[nivel];
  }

  // Clase de color según el puntaje
  nivel(puntos: number): 'alto' | 'medio' | 'bajo' {
    if (puntos >= 75) return 'alto';
    if (puntos >= 50) return 'medio';
    return 'bajo';
  }

  // Anillo del puntaje total
  fondoAnillo(puntos: number): string {
    return `conic-gradient(var(--color-puntaje) ${puntos * 3.6}deg, rgba(255, 255, 255, 0.1) 0deg)`;
  }

  // ======================================================
  // NAVEGACIÓN
  // ======================================================

  irAMisResultados(): void {
    void this.router.navigate(['/compatibilidad/mis-resultados']);
  }

  nuevaEvaluacion(): void {
    void this.router.navigate(['/marketplace'], { queryParams: { categoria: 'Compatibilidad' } });
  }

  volverAlMarketplace(): void {
    void this.router.navigate(['/marketplace']);
  }
}
