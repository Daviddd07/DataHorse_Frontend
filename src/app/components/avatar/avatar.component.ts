import { Component, computed, input } from '@angular/core';

import { urlDeSubida } from '../../Services/cuenta.service';

// Avatar redondo de un usuario: su foto de perfil o, si no tiene, su inicial sobre el dorado.
@Component({
  selector: 'app-avatar',
  standalone: true,
  host: {
    '[style.width.px]': 'tamano()',
    '[style.height.px]': 'tamano()',
    '[style.font-size.px]': 'tamano() * 0.42',
    '[class.con-foto]': 'url()',
    'aria-hidden': 'true',
  },
  template: `
    @if (url(); as foto) {
      <img [src]="foto" alt="" />
    } @else {
      {{ inicial() }}
    }
  `,
  styles: `
    :host {
      display: inline-grid;
      place-items: center;
      flex-shrink: 0;
      overflow: hidden;
      border-radius: 50%;
      background: linear-gradient(135deg, #e6a817, #b5651d);
      color: #fff;
      font-weight: 800;
      line-height: 1;
    }

    :host(.con-foto) {
      background: #222;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
})
export class AvatarComponent {
  nombre = input('');
  foto = input<string | null | undefined>(null); // ruta pública ('/uploads/perfiles/...')
  tamano = input(36);

  url = computed(() => urlDeSubida(this.foto()));
  inicial = computed(() => this.nombre().trim().charAt(0).toUpperCase() || '?');
}
