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
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

      :host {
        display: block;
        font-family:
          'Inter',
          -apple-system,
          sans-serif;
      }

      /* Fondo oscuro y centrado */
      .contenedor {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background: linear-gradient(160deg, #0f172a 0%, #1e293b 45%, #0f172a 100%);
        box-sizing: border-box;
      }

      /* Animación de entrada: se desliza desde abajo */
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

      .card {
        width: min(420px, 100%);
        background: #ffffff;
        padding: 44px 40px;
        border-radius: 10px;
        border: 1px solid rgba(15, 23, 42, 0.06);
        box-shadow:
          0 1px 2px rgba(15, 23, 42, 0.04),
          0 20px 40px -12px rgba(15, 23, 42, 0.35);
        text-align: center;
        box-sizing: border-box;

        /* Aplicamos la animación aquí */
        animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      h1 {
        margin: 0 0 6px;
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.02em;
        color: #0f172a;
      }

      .sub {
        margin: 0 0 24px;
        font-size: 14px;
        color: #64748b;
        line-height: 1.5;
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
        color: #334155;
      }

      /* Estilos de los inputs */
      input {
        width: 100%;
        height: 46px !important;
        box-sizing: border-box;
        padding: 11px 14px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-family: inherit;
        font-size: 14px;
        color: #0f172a;
        background-color: #f8fafc;
        outline: none;
        transition:
          border-color 0.15s ease,
          box-shadow 0.15s ease,
          background-color 0.15s ease;
      }

      input:focus {
        border-color: #4f46e5;
        background-color: #ffffff;
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
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
        color: #64748b;
        cursor: pointer;
        border-radius: 50%;
        transition: background 0.2s;
      }

      .ver:hover {
        background: #e2e8f0;
        color: #0f172a;
      }

      .ver svg {
        width: 20px;
        height: 20px;
      }

      /* Botón primario (morado) */
      .primario {
        width: 100%;
        height: 46px;
        padding: 0 12px;
        margin-top: 10px;
        border: none;
        border-radius: 6px;
        background-color: #4f46e5;
        color: #ffffff;
        font-family: inherit;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition:
          background-color 0.15s ease,
          transform 0.05s ease;
      }

      .primario:hover:not(:disabled) {
        background-color: #4338ca;
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
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        text-align: left;
      }

      .error-msg {
        background-color: #fef2f2;
        color: #b91c1c;
        border: 1px solid #fecaca;
      }

      .ok-msg {
        background-color: #ecfdf5;
        color: #065f46;
        border: 1px solid #a7f3d0;
      }

      /* Enlace de abajo */
      .pie {
        margin: 24px 0 0;
        font-size: 13px;
        color: #64748b;
      }

      a {
        color: #4f46e5;
        font-weight: 600;
        text-decoration: none;
        transition: color 0.15s ease;
      }

      a:hover {
        color: #4338ca;
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

  // Variables para el ojito
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
