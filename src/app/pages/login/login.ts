import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  NgZone,
  ViewChild,
  inject,
  signal,
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import { Router, RouterLink } from '@angular/router';

import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../Services/auth.service';

import { LogService } from '../../Services/log.service';

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

  @ViewChild('botonCrearContrasena')
  botonCrearContrasena!: ElementRef<HTMLButtonElement>;

  mostrarAvisoContrasena = false;

  private readonly auth = inject(AuthService);

  private readonly router = inject(Router);

  private readonly zone = inject(NgZone);

  private readonly cdr = inject(ChangeDetectorRef);

  private readonly log = inject(LogService);
  private googleInitialized = false;
  correo = '';

  password = '';

  verPassword = signal(false);

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
      theme: 'filled_black' /* Tema oscuro oficial */,
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      width: 300 /* Un poco más angosto para evitar desbordes */,
    });
  }

  iniciarConGoogle(credential: string): void {
    if (!credential) return;

    this.mensaje = '';

    this.cargandoGoogle = true;

    this.auth.google(credential).subscribe({
      next: (respuesta) => {
        this.log.info('Inicio de sesión exitoso', { metodo: 'google' });

        if (respuesta?.requiere_contrasena) {
          this.cargandoGoogle = false;
          this.abrirAvisoContrasena();
          return;
        }

        this.irSegunRol();
      },

      error: (e: HttpErrorResponse) => {
        this.cargandoGoogle = false;

        this.log.warn('Inicio de sesión fallido', { metodo: 'google', status: e.status });

        this.mensaje = e.error?.detail || 'No fue posible iniciar sesión con Google.';

        this.cdr.detectChanges();
      },
    });
  }

  // El botón sigue en "Ingresando..." hasta que la siguiente pantalla abre,
  // así no queda un hueco sin respuesta mientras se consulta el rol y carga la ruta.
  private irSegunRol(): void {
    this.cargando = true;

    this.auth.destinoTrasLogin().subscribe((destino) => {
      void this.router.navigate([destino]).finally(() => {
        this.cargando = false;
        this.cargandoGoogle = false;
        this.cdr.markForCheck();
      });
    });
  }

  // =====================================================
  // AVISO: CUENTA QUE SOLO ENTRA CON GOOGLE
  // =====================================================

  private abrirAvisoContrasena(): void {
    this.mostrarAvisoContrasena = true;
    this.cdr.detectChanges();
    this.botonCrearContrasena.nativeElement.focus();
  }

  crearContrasenaAhora(): void {
    this.mostrarAvisoContrasena = false;
    void this.router.navigate(['/recuperar-password'], { queryParams: { modo: 'crear' } });
  }

  omitirContrasena(): void {
    this.mostrarAvisoContrasena = false;
    this.irSegunRol();
  }

  @HostListener('document:keydown.escape')
  cerrarAvisoConEscape(): void {
    if (this.mostrarAvisoContrasena) this.omitirContrasena();
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
        this.log.info('Inicio de sesión exitoso', { metodo: 'correo' });

        this.irSegunRol();
      },

      error: (e: HttpErrorResponse) => {
        this.cargando = false;

        this.log.warn('Inicio de sesión fallido', { metodo: 'correo', status: e.status });

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
      void this.router.navigate(['/registrar']);
      return;
    }

    (document.activeElement as HTMLElement | null)?.blur();
    tarjeta.classList.add('volteando');
    document.body.classList.add('giro-entrando');

    setTimeout(() => {
      void this.router.navigate(['/registrar']).then((ok) => {
        if (!ok) tarjeta.classList.remove('volteando');
      });
    }, 500);

    setTimeout(() => document.body.classList.remove('giro-entrando'), 1600);
  }
}
