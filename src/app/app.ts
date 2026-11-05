import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AvisoMensajeComponent } from './components/aviso-mensaje/aviso-mensaje.component';
import { NotificacionesService } from './Services/notificaciones.service';

// Pantallas sin sesión: ahí no se escuchan avisos de mensajes
const RUTAS_PUBLICAS = ['/login', '/registrar', '/verificar-correo', '/recuperar-password'];

export function esRutaPublica(url: string): boolean {
  const ruta = url.split(/[?#]/)[0];
  return ruta === '/' || RUTAS_PUBLICAS.some((p) => ruta === p || ruta.startsWith(`${p}/`));
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AvisoMensajeComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('frontend');

  private readonly notificaciones = inject(NotificacionesService);

  constructor() {
    inject(Router)
      .events.pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => {
        if (esRutaPublica(e.urlAfterRedirects)) {
          this.notificaciones.detener();
        } else {
          this.notificaciones.iniciar();
        }
      });
  }
}
