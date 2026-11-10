import { Component, input } from '@angular/core';

export const TEXTO_SELLO = 'Con documentos de respaldo (aportados por el propietario)';

/**
 * Sello dorado junto al nombre de un caballo con documentos de respaldo
 * (pedigrí, premios, pruebas genéticas). Al estilo del verificado de las redes,
 * pero dorado y con su propio texto: indica que hay documentos, no que DataHorse
 * los haya verificado.
 * Uso: <app-sello-respaldo [tamano]="18" />
 */
@Component({
  selector: 'app-sello-respaldo',
  standalone: true,
  host: {
    role: 'img',
    '[attr.aria-label]': 'texto',
    '[attr.title]': 'texto',
    '[style.--tamano.px]': 'tamano()',
  },
  template: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        class="sr-roseta"
        d="M12 1 L14.38 3.11 L17.5 2.47 L18.51 5.49 L21.53 6.5 L20.89 9.62 L23 12 L20.89 14.38
           L21.53 17.5 L18.51 18.51 L17.5 21.53 L14.38 20.89 L12 23 L9.62 20.89 L6.5 21.53
           L5.49 18.51 L2.47 17.5 L3.11 14.38 L1 12 L3.11 9.62 L2.47 6.5 L5.49 5.49 L6.5 2.47
           L9.62 3.11 Z"
      />
      <path class="sr-check" d="M7.6 12.3 L10.6 15.2 L16.6 9.1" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
      width: var(--tamano, 18px);
      height: var(--tamano, 18px);
      vertical-align: middle;
      cursor: help;
    }
    svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    .sr-roseta {
      fill: var(--accent-gold, #e6a817);
      stroke: var(--accent-gold, #e6a817);
      stroke-width: 1.4;
      stroke-linejoin: round;
    }
    .sr-check {
      fill: none;
      stroke: #1a1307;
      stroke-width: 2.4;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
})
export class SelloRespaldoComponent {
  /** Lado del sello en píxeles. */
  readonly tamano = input(18);

  readonly texto = TEXTO_SELLO;
}
