import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  ViewChild,
  inject,
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import { Router, RouterLink } from '@angular/router';

import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../Services/auth.service';

import { environment } from '../../../environments/environment';
declare global {
  interface Window {
    google: any;
  }
}

@Component({
  selector: 'app-login',

  standalone: true,

  imports: [FormsModule, CommonModule, RouterLink],

  templateUrl: './login.html',

  styleUrls: ['./login.css', './login.animations.css'],
})
export class Login implements AfterViewInit {
  @ViewChild('googleButton')
  googleButton!: ElementRef<HTMLDivElement>;

  private auth = inject(AuthService);

  private router = inject(Router);

  private zone = inject(NgZone);

  private cdr = inject(ChangeDetectorRef);
  private googleInitialized = false;
  correo = '';

  password = '';

  mensaje = '';

  cargando = false;

  cargandoGoogle = false;

  necesitaVerificacion = false;

  ngAfterViewInit(): void {
    this.inicializarGoogle();
  }

  private inicializarGoogle(intento = 0): void {
    if (!window.google?.accounts?.id) {
      if (intento < 30) {
        setTimeout(() => this.inicializarGoogle(intento + 1), 250);
      }

      return;
    }
    if (this.googleInitialized) {
      return;
    }
    this.googleInitialized = true;
    // 👆 FIN DEL CAMBIO 👆

    window.google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (respuesta: any) => {
        this.zone.run(() => this.iniciarConGoogle(respuesta.credential));
      },
    });

    window.google.accounts.id.renderButton(this.googleButton.nativeElement, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      width: 320,
    });
  }

  iniciarConGoogle(credential: string): void {
    if (!credential) return;

    this.mensaje = '';

    this.cargandoGoogle = true;

    this.auth.google(credential).subscribe({
      next: () => {
        this.cargandoGoogle = false;

        this.router.navigate(['/marketplace']);
      },

      error: (e: HttpErrorResponse) => {
        this.cargandoGoogle = false;

        this.mensaje = e.error?.detail || 'No fue posible iniciar sesión con Google.';

        this.cdr.detectChanges();
      },
    });
  }

  iniciarSesion(): void {
    // 1. Validación en el frontend (campos vacíos o contraseña muy corta)
    if (!this.correo || !this.password || this.password.length < 8) {
      this.mensaje = 'Contraseña o correo incorrecto.';
      return;
    }

    this.mensaje = '';
    this.necesitaVerificacion = false;
    this.cargando = true;

    this.auth.login(this.correo.trim().toLowerCase(), this.password).subscribe({
      next: () => {
        this.cargando = false;

        this.router.navigate(['/marketplace']);
      },

      error: (e: HttpErrorResponse) => {
        this.cargando = false;

        // 2. Excepción: Si el correo no está verificado, mostramos el aviso
        if (e.status === 403) {
          this.mensaje = 'Debes verificar tu correo antes de iniciar sesión.';
          this.necesitaVerificacion = true;
          return;
        }

        // 3. Cualquier otro error (401, 500, etc.) mostramos el mensaje genérico
        this.mensaje = 'Contraseña o correo incorrecto.';
      },
    });
  }

  limpiarMensaje(): void {
    if (this.mensaje) {
      this.mensaje = '';

      this.necesitaVerificacion = false;
    }
  }
  irARegistro(event: Event): void {
    event.preventDefault();

    const tarjeta = (event.currentTarget as HTMLElement).closest('.login-card');
    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!tarjeta || sinMovimiento) {
      this.router.navigate(['/registrar']);
      return;
    }

    (document.activeElement as HTMLElement | null)?.blur();
    tarjeta.classList.add('volteando');
    document.body.classList.add('giro-entrando');

    setTimeout(() => {
      this.router.navigate(['/registrar']).then((ok) => {
        if (!ok) tarjeta.classList.remove('volteando');
      });
    }, 500);

    setTimeout(() => document.body.classList.remove('giro-entrando'), 1600);
  }
}
