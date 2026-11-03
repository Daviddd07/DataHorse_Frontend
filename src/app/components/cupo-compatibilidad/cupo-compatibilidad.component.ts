import { Component, input } from '@angular/core';

import { CupoCompatibilidad } from '../../Services/compatibilidad.service';

// Muestra cuántas estimaciones de compatibilidad le quedan hoy al usuario.
@Component({
  selector: 'app-cupo-compatibilidad',
  standalone: true,
  template: `
    @if (cupo(); as c) {
      <output class="cupo" [class.cupo-agotado]="c.restantes === 0">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14.6l-5 3.6 1.9-5.8L4 8.8h6.1z"></path>
        </svg>
        @if (c.restantes > 0) {
          <span
            >Te quedan <strong>{{ c.restantes }} de {{ c.limite }}</strong> estimaciones hoy</span
          >
        } @else {
          <span>Usaste tus {{ c.limite }} estimaciones de hoy. Se renuevan a medianoche.</span>
        }
      </output>
    }
  `,
  styles: `
    .cupo {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      padding: 8px 14px;
      border-radius: 999px;
      border: 1px solid rgba(230, 168, 23, 0.4);
      background: rgba(230, 168, 23, 0.12);
      color: #ffffff;
      font-size: 0.85rem;
    }

    .cupo svg {
      width: 16px;
      height: 16px;
      color: #e6a817;
      flex-shrink: 0;
    }

    .cupo strong {
      color: #e6a817;
    }

    .cupo-agotado {
      border-color: rgba(255, 107, 107, 0.4);
      background: rgba(255, 107, 107, 0.12);
    }

    .cupo-agotado svg {
      color: #ff6b6b;
    }
  `,
})
export class CupoCompatibilidadComponent {
  cupo = input<CupoCompatibilidad | null>(null);
}
