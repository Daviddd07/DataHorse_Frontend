import { Component, inject, signal } from '@angular/core';

import { Router } from '@angular/router';

import { AuthService } from '../../../Services/auth.service';

@Component({
  selector: 'app-elegir-panel',
  standalone: true,
  templateUrl: './elegir-panel.component.html',
  styleUrls: ['./elegir-panel.component.css'],
})
export class ElegirPanelComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  nombreUsuario = signal('');

  constructor() {
    this.auth.me().subscribe({
      next: (usuario) => this.nombreUsuario.set(usuario.nombre.trim().split(/\s+/)[0]),
      error: () => this.nombreUsuario.set(''),
    });
  }

  irAlPanel(): void {
    void this.router.navigate(['/admin']);
  }

  irAlMarketplace(): void {
    void this.router.navigate(['/marketplace']);
  }

  cerrarSesion(): void {
    // Aunque el backend falle, igual sacamos al usuario
    this.auth.logout().subscribe({
      next: () => void this.router.navigate(['/login']),
      error: () => void this.router.navigate(['/login']),
    });
  }
}
