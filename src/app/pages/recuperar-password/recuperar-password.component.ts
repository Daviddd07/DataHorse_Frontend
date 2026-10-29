import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../Services/auth.service';

@Component({
  selector: 'app-recuperar-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <main class="contenedor">
      <section class="card">
        <!-- Logo de DataHorse -->
        <img src="Logo_blanco.png" alt="DataHorse" class="logo" />

        <h1>Recuperar contraseña</h1>

        @if (paso === 1) {
          <p class="sub">Ingresa tu correo y te enviaremos un código de recuperación.</p>

          <div class="campo">
            <label for="correo">Correo electrónico</label>
            <input
              id="correo"
              type="email"
              [(ngModel)]="correo"
              placeholder="ejemplo@correo.com"
              autocomplete="email"
            />
          </div>

          @if (mensaje) {
            <p class="mensaje" [class.error-msg]="error" [class.ok-msg]="!error">
              {{ mensaje }}
            </p>
          }

          <button type="submit" class="primario" (click)="enviarCodigo()" [disabled]="cargando">
            {{ cargando ? 'Enviando...' : 'Enviar código' }}
          </button>
        }

        @if (paso === 2) {
          <p class="sub">
            Escribe el código enviado a:<br />
            <strong>{{ correo }}</strong>
          </p>

          <div class="campo">
            <label for="codigo">Código de 6 dígitos</label>
            <input
              id="codigo"
              type="text"
              [(ngModel)]="codigo"
              maxlength="6"
              inputmode="numeric"
              placeholder="000000"
            />
          </div>

          <div class="campo">
            <label for="nuevaPassword">Nueva contraseña</label>
            <div class="con-boton">
              <input
                id="nuevaPassword"
                [type]="verPass ? 'text' : 'password'"
                [(ngModel)]="nuevaPassword"
                placeholder="Mínimo 8 caracteres"
                autocomplete="new-password"
              />
              <button
                type="button"
                class="ver"
                (click)="verPass = !verPass"
                aria-label="Ver contraseña"
              >
                @if (verPass) {
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                    ></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                } @else {
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                }
              </button>
            </div>
          </div>

          <div class="campo">
            <label for="confirmarPassword">Confirmar contraseña</label>
            <div class="con-boton">
              <input
                id="confirmarPassword"
                [type]="verConfirmar ? 'text' : 'password'"
                [(ngModel)]="confirmarPassword"
                placeholder="Repite la contraseña"
                autocomplete="new-password"
              />
              <button
                type="button"
                class="ver"
                (click)="verConfirmar = !verConfirmar"
                aria-label="Ver contraseña"
              >
                @if (verConfirmar) {
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                    ></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                } @else {
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                }
              </button>
            </div>
          </div>

          @if (mensaje) {
            <p class="mensaje" [class.error-msg]="error" [class.ok-msg]="!error">
              {{ mensaje }}
            </p>
          }

          <button type="submit" class="primario" (click)="cambiarPassword()" [disabled]="cargando">
            {{ cargando ? 'Actualizando...' : 'Cambiar contraseña' }}
          </button>
        }

        <p class="pie">
          <a routerLink="/login">Volver al inicio de sesión</a>
        </p>
      </section>
    </main>
  `,
  styles: [
    `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

      :host {
        --bg-glass: rgba(30, 35, 40, 0.65);
        --border-glass: rgba(255, 255, 255, 0.15);
        --text-main: #ffffff;
        --text-muted: rgba(255, 255, 255, 0.7);
        --accent-gold: #e6a817;
        --accent-leather: #b5651d;

        display: block;
        font-family:
          'Inter',
          -apple-system,
          sans-serif;
      }

      /* Fondo oscuro inmersivo */
      .contenedor {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background-image:
          linear-gradient(rgba(15, 20, 25, 0.65), rgba(15, 20, 25, 0.85)),
          url('https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?q=80&w=1920&auto=format&fit=crop');
        background-size: cover;
        background-position: center;
        background-attachment: fixed;
        box-sizing: border-box;
      }

      @keyframes slideUpFade {
        0% {
          opacity: 0;
          transform: translateY(40px);
        }
        100% {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* Tarjeta de cristal */
      .card {
        width: min(420px, 100%);
        background: var(--bg-glass);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        padding: 44px 40px;
        border-radius: 24px;
        border: 1px solid var(--border-glass);
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
        text-align: center;
        box-sizing: border-box;
        animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      /* Logo */
      .logo {
        display: block;
        margin: 0 auto 16px;
        width: 72px;
        height: 72px;
        object-fit: contain;
        filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5));
      }

      h1 {
        margin: 0 0 6px;
        font-size: 24px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: var(--text-main);
      }

      .sub {
        margin: 0 0 24px;
        font-size: 14px;
        color: var(--text-muted);
        line-height: 1.5;
      }

      .sub strong {
        color: var(--accent-gold);
      }

      .campo {
        text-align: left;
        margin-bottom: 20px;
      }

      label {
        display: block;
        margin-bottom: 6px;
        font-size: 13px;
        font-weight: 500;
        color: var(--text-muted);
      }

      /* Inputs oscuros */
      input {
        width: 100%;
        height: 46px !important;
        box-sizing: border-box;
        padding: 11px 14px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        font-family: inherit;
        font-size: 14px;
        color: var(--text-main);
        background-color: rgba(0, 0, 0, 0.3);
        outline: none;
        transition: all 0.2s ease;
      }

      input::placeholder {
        color: rgba(255, 255, 255, 0.4);
      }

      input:hover {
        border-color: rgba(255, 255, 255, 0.4);
      }

      input:focus {
        border-color: var(--accent-gold);
        background-color: rgba(0, 0, 0, 0.5);
        box-shadow: 0 0 0 3px rgba(230, 168, 23, 0.15);
      }

      /* Ojito de la contraseña */
      .con-boton {
        position: relative;
      }

      .con-boton input {
        padding-right: 44px;
      }

      .ver {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        background: transparent;
        color: rgba(255, 255, 255, 0.5);
        cursor: pointer;
        border-radius: 50%;
        transition: all 0.2s;
      }

      .ver:hover {
        background: rgba(255, 255, 255, 0.1);
        color: var(--text-main);
      }

      .ver svg {
        width: 20px;
        height: 20px;
      }

      /* Botón principal (Cuero) */
      .primario {
        width: 100%;
        height: 46px;
        padding: 0 12px;
        margin-top: 10px;
        border: none;
        border-radius: 8px;
        background-color: var(--accent-leather);
        color: #ffffff;
        font-family: inherit;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 8px 20px rgba(181, 101, 29, 0.3);
      }

      .primario:hover:not(:disabled) {
        background-color: #9a5214;
        transform: translateY(-2px);
      }

      .primario:active:not(:disabled) {
        transform: scale(0.98);
      }

      .primario:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      /* Mensajes de error/éxito */
      .mensaje {
        margin: 0 0 16px;
        padding: 10px 14px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        text-align: left;
      }

      .error-msg {
        background-color: rgba(255, 107, 107, 0.15);
        color: #ff6b6b;
        border: 1px solid rgba(255, 107, 107, 0.3);
      }

      .ok-msg {
        background-color: rgba(74, 222, 128, 0.15);
        color: #4ade80;
        border: 1px solid rgba(74, 222, 128, 0.3);
      }

      /* Enlace de abajo */
      .pie {
        margin: 24px 0 0;
        font-size: 13px;
        color: var(--text-muted);
      }

      a {
        color: var(--accent-gold);
        font-weight: 600;
        text-decoration: none;
        transition: color 0.15s ease;
      }

      a:hover {
        color: #ffffff;
        text-decoration: underline;
      }
    `,
  ],
})
export class RecuperarPasswordComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private cd = inject(ChangeDetectorRef);

  paso = 1;
  correo = '';
  codigo = '';
  nuevaPassword = '';
  confirmarPassword = '';
  mensaje = '';
  error = false;
  cargando = false;

  verPass = false;
  verConfirmar = false;

  enviarCodigo(): void {
    const correo = this.correo.trim().toLowerCase();

    if (!correo) {
      this.error = true;
      this.mensaje = 'Ingresa tu correo.';
      return;
    }

    this.correo = correo;
    this.cargando = true;
    this.mensaje = '';

    this.auth.forgotPassword(correo).subscribe({
      next: (respuesta) => {
        this.cargando = false;
        this.error = false;
        this.mensaje = respuesta.mensaje;
        this.paso = 2;

        this.cd.detectChanges();
      },
      error: (e: HttpErrorResponse) => {
        this.cargando = false;
        this.error = true;
        this.mensaje = e.error?.detail || 'No fue posible enviar el código.';
        this.cd.detectChanges();
      },
    });
  }

  cambiarPassword(): void {
    if (!/^\d{6}$/.test(this.codigo.trim())) {
      this.error = true;
      this.mensaje = 'El código debe tener 6 dígitos.';
      return;
    }

    if (this.nuevaPassword.length < 8) {
      this.error = true;
      this.mensaje = 'La contraseña debe tener mínimo 8 caracteres.';
      return;
    }

    if (this.nuevaPassword !== this.confirmarPassword) {
      this.error = true;
      this.mensaje = 'Las contraseñas no coinciden.';
      return;
    }

    this.cargando = true;

    this.auth.resetPassword(this.correo, this.codigo.trim(), this.nuevaPassword).subscribe({
      next: () => {
        this.cargando = false;
        this.router.navigate(['/login']);
      },
      error: (e: HttpErrorResponse) => {
        this.cargando = false;
        this.error = true;
        this.mensaje = e.error?.detail || 'No fue posible cambiar la contraseña.';
      },
    });
  }
}
