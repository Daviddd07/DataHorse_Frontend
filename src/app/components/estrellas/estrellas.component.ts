import { Component, computed, input } from '@angular/core';

import { Calificacion } from '../../Services/conversacion.service';

const MAXIMO = 5;

/** Calificación de un usuario: 5 estrellas rellenas según el promedio (1 a 5) y cuántas reseñas tiene. */
@Component({
  selector: 'app-estrellas',
  standalone: true,
  host: {
    role: 'img',
    '[attr.aria-label]': 'descripcion()',
    '[class.compacto]': 'compacto()',
  },
  template: `
    @if (tieneResenas()) {
      <span class="es-iconos" aria-hidden="true">
        @for (relleno of rellenos(); track $index) {
          <span class="es-estrella" [style.--relleno.%]="relleno">★</span>
        }
      </span>
      <span class="es-promedio" aria-hidden="true">{{ promedioTexto() }}</span>
      @if (!compacto()) {
        <span class="es-total" aria-hidden="true">({{ calificacion()?.total }})</span>
      }
    } @else {
      <span class="es-sin" aria-hidden="true">Sin reseñas</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.85rem;
      line-height: 1;
      color: rgba(255, 255, 255, 0.75);
    }

    :host(.compacto) {
      font-size: 0.75rem;
    }

    .es-iconos {
      display: inline-flex;
      gap: 1px;
    }

    /* Cada estrella se rellena de dorado según su porcentaje (permite medias estrellas) */
    .es-estrella {
      background: linear-gradient(
        90deg,
        #e6a817 var(--relleno, 0%),
        rgba(255, 255, 255, 0.25) var(--relleno, 0%)
      );
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }

    .es-promedio {
      font-weight: 700;
      color: #e6a817;
    }

    .es-sin {
      font-style: italic;
      color: rgba(255, 255, 255, 0.5);
    }
  `,
})
export class EstrellasComponent {
  calificacion = input<Calificacion | null | undefined>(null);
  compacto = input(false);

  tieneResenas = computed(() => {
    const c = this.calificacion();
    return !!c && c.total > 0 && c.promedio !== null;
  });

  rellenos = computed(() => {
    const promedio = this.calificacion()?.promedio ?? 0;
    return Array.from({ length: MAXIMO }, (_, i) =>
      Math.round(Math.min(Math.max(promedio - i, 0), 1) * 100),
    );
  });

  promedioTexto = computed(() => (this.calificacion()?.promedio ?? 0).toFixed(1).replace('.', ','));

  descripcion = computed(() => {
    const c = this.calificacion();
    if (!this.tieneResenas() || !c) {
      return 'Sin reseñas todavía';
    }
    const resenas = c.total === 1 ? 'reseña' : 'reseñas';
    return `${this.promedioTexto()} de ${MAXIMO} estrellas, ${c.total} ${resenas}`;
  });
}
