import { Component, OnDestroy, computed, input, signal } from '@angular/core';

import { EstadoConexion } from '../../Services/conversacion.service';

const MINUTO_MS = 60_000;

/** "Hace un momento", "hace 5 min", "hace 3 h", "hace 2 días"... desde una hora local sin zona. */
export function haceCuanto(desde: string, ahora: Date = new Date()): string {
  const minutos = Math.floor((ahora.getTime() - new Date(desde).getTime()) / MINUTO_MS);
  if (Number.isNaN(minutos)) {
    return '';
  }
  if (minutos < 1) {
    return 'hace un momento';
  }
  if (minutos < 60) {
    return `hace ${minutos} min`;
  }
  const horas = Math.floor(minutos / 60);
  if (horas < 24) {
    return `hace ${horas} h`;
  }
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'hace 1 día' : `hace ${dias} días`;
}

/** Punto verde "En línea" o gris "Inactivo · visto hace 10 min" de la otra persona del chat. */
@Component({
  selector: 'app-estado-conexion',
  standalone: true,
  host: {
    '[class.en-linea]': 'enLinea()',
    '[class.solo-punto]': 'soloPunto()',
    '[attr.title]': 'texto()',
  },
  template: `
    <span class="ec-punto" aria-hidden="true"></span>
    @if (soloPunto()) {
      <span class="ec-oculto">{{ texto() }}</span>
    } @else {
      <span>{{ texto() }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.6);
    }

    :host(.en-linea) {
      color: #4ade80;
    }

    .ec-punto {
      width: 9px;
      height: 9px;
      flex-shrink: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.35);
    }

    :host(.en-linea) .ec-punto {
      background: #4ade80;
      box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.2);
    }

    :host(.solo-punto) .ec-punto {
      width: 11px;
      height: 11px;
      border: 2px solid #1b1f24;
      box-shadow: none;
    }

    .ec-oculto {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
  `,
})
export class EstadoConexionComponent implements OnDestroy {
  conexion = input<EstadoConexion | null | undefined>(null);
  soloPunto = input(false);

  // Se actualiza cada minuto para que "visto hace X" no quede congelado
  private readonly ahora = signal(new Date());
  private readonly reloj = setInterval(() => this.ahora.set(new Date()), MINUTO_MS);

  enLinea = computed(() => !!this.conexion()?.en_linea);

  texto = computed(() => {
    const conexion = this.conexion();
    if (conexion?.en_linea) {
      return 'En línea';
    }
    if (conexion?.ultima_conexion) {
      const hace = haceCuanto(conexion.ultima_conexion, this.ahora());
      return hace ? `Inactivo · visto ${hace}` : 'Inactivo';
    }
    return 'Inactivo';
  });

  ngOnDestroy(): void {
    clearInterval(this.reloj);
  }
}
