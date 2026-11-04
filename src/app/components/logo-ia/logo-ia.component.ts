import { Component, input } from '@angular/core';

let siguienteId = 0;

// Logo de la IA de DataHorse: un destello central con dos órbitas.
// En reposo solo titila; con [pensando]="true" las órbitas giran y el núcleo late (mientras la IA analiza).
@Component({
  selector: 'app-logo-ia',
  standalone: true,
  host: {
    '[style.width.px]': 'tamano()',
    '[style.height.px]': 'tamano()',
    '[class.pensando]': 'pensando()',
    'aria-hidden': 'true',
  },
  template: `
    <svg viewBox="0 0 48 48" fill="none">
      <defs>
        <linearGradient
          [attr.id]="idGradiente"
          x1="6"
          y1="6"
          x2="42"
          y2="42"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stop-color="#c4b5fd" />
          <stop offset="0.55" stop-color="#8b5cf6" />
          <stop offset="1" stop-color="#22d3ee" />
        </linearGradient>
      </defs>

      <g class="orbita orbita-a">
        <ellipse
          cx="24"
          cy="24"
          rx="21"
          ry="8"
          [attr.stroke]="relleno"
          stroke-width="1.4"
          opacity="0.55"
        />
        <circle cx="45" cy="24" r="2" fill="#22d3ee" />
      </g>
      <g class="orbita orbita-b">
        <ellipse
          cx="24"
          cy="24"
          rx="21"
          ry="8"
          [attr.stroke]="relleno"
          stroke-width="1.4"
          opacity="0.55"
        />
        <circle cx="3" cy="24" r="2" fill="#c4b5fd" />
      </g>

      <path
        class="nucleo"
        d="M24 9c1.6 8.6 5.4 12.4 14 14-8.6 1.6-12.4 5.4-14 14-1.6-8.6-5.4-12.4-14-14 8.6-1.6 12.4-5.4 14-14z"
        [attr.fill]="relleno"
      />
      <path
        class="chispa"
        d="M38 4c.5 2.6 1.4 3.5 4 4-2.6.5-3.5 1.4-4 4-.5-2.6-1.4-3.5-4-4 2.6-.5 3.5-1.4 4-4z"
        fill="#ffffff"
      />
    </svg>
  `,
  styles: `
    :host {
      display: inline-block;
      flex-shrink: 0;
      filter: drop-shadow(0 0 6px rgba(139, 92, 246, 0.55));
    }

    svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    .orbita,
    .nucleo,
    .chispa {
      transform-box: view-box;
      transform-origin: 24px 24px;
    }

    .orbita-a {
      transform: rotate(30deg);
    }

    .orbita-b {
      transform: rotate(-30deg);
    }

    .chispa {
      transform-origin: 38px 8px;
    }

    .chispa {
      animation: titilar 2.4s ease-in-out infinite;
    }

    :host(.pensando) .orbita-a {
      animation: girar-a 3.2s linear infinite;
    }

    :host(.pensando) .orbita-b {
      animation: girar-b 4.4s linear infinite;
    }

    :host(.pensando) .nucleo {
      animation: latir 1.6s ease-in-out infinite;
    }

    :host(.pensando) {
      animation: resplandor 1.6s ease-in-out infinite;
    }

    @keyframes girar-a {
      from {
        transform: rotate(30deg);
      }
      to {
        transform: rotate(390deg);
      }
    }

    @keyframes girar-b {
      from {
        transform: rotate(-30deg);
      }
      to {
        transform: rotate(-390deg);
      }
    }

    @keyframes latir {
      50% {
        transform: scale(0.82);
      }
    }

    @keyframes titilar {
      0%,
      100% {
        opacity: 1;
        transform: scale(1);
      }
      50% {
        opacity: 0.25;
        transform: scale(0.5);
      }
    }

    @keyframes resplandor {
      50% {
        filter: drop-shadow(0 0 14px rgba(34, 211, 238, 0.7));
      }
    }
  `,
})
export class LogoIaComponent {
  tamano = input(24);
  pensando = input(false);

  // id único: varios logos en la misma página no comparten (ni rompen) el degradado
  readonly idGradiente = `logo-ia-${siguienteId++}`;
  readonly relleno = `url(#${this.idGradiente})`;
}
