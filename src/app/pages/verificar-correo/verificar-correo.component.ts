import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { RegistroService } from '../../Services/Registro.service';

@Component({
  selector: 'app-verificar-correo',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <main class="contenedor">
      <section class="card">
        <h1>Verifica tu correo</h1>

        <p class="sub">Enviamos un código de 6 dígitos a:</p>

        <strong class="correo-destino">
          {{ correo }}
        </strong>

        <input
          type="text"
          inputmode="numeric"
          maxlength="6"
          placeholder="000000"
          [ngModel]="codigo()"
          (ngModelChange)="codigo.set($event)"
          class="codigo-input"
          [class.invalido]="esError()"
        />

        @if (mensaje()) {
          <p class="mensaje" [class.error-msg]="esError()" [class.ok-msg]="!esError()">
            {{ mensaje() }}
          </p>
        }

        <button type="button" class="primario" (click)="verificar()" [disabled]="cargando()">
          {{ cargando() ? 'Verificando...' : 'Verificar cuenta' }}
        </button>

        <button type="button" class="secundario" (click)="reenviar()" [disabled]="reenviando()">
          {{ reenviando() ? 'Enviando...' : 'Reenviar código' }}
        </button>

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

      /* Animación de entrada */
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
        animation: slideUpFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      h1 {
        margin: 0 0 10px;
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.02em;
        color: #0f172a;
      }

      .sub {
        margin: 0 0 8px;
        font-size: 14px;
        color: #64748b;
      }

      .correo-destino {
        display: block;
        font-size: 16px;
        font-weight: 600;
        color: #4f46e5;
        margin-bottom: 24px;
        word-break: break-all;
      }

      /* Input del código */
      .codigo-input {
        width: 100%;
        box-sizing: border-box;
        margin: 0 0 20px;
        padding: 16px;
        font-size: 32px;
        font-weight: 700;
        font-family: monospace; /* Para que los números se vean alineados */
        text-align: center;
        letter-spacing: 12px;
        color: #0f172a;
        background-color: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        outline: none;
        transition: all 0.2s ease;
      }

      .codigo-input::placeholder {
        color: #cbd5e1;
        letter-spacing: 12px;
      }

      .codigo-input:focus {
        border-color: #4f46e5;
        background-color: #ffffff;
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
      }

      .codigo-input.invalido {
        border-color: #dc2626;
      }
      .codigo-input.invalido:focus {
        box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15);
      }

      /* Mensajes */
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

      /* Botón Primario (Morado) */
      .primario {
        width: 100%;
        height: 46px;
        padding: 0 12px;
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

      /* Botón Secundario (Reenviar) */
      .secundario {
        width: 100%;
        height: 46px;
        margin-top: 12px;
        padding: 0 12px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        background-color: transparent;
        color: #475569;
        font-family: inherit;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition:
          background-color 0.15s ease,
          color 0.15s ease;
      }

      .secundario:hover:not(:disabled) {
        background-color: #f1f5f9;
        color: #0f172a;
      }

      .secundario:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      /* Enlace de abajo */
      .pie {
        margin: 24px 0 0;
        font-size: 13px;
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
export class VerificarCorreoComponent {
  private route = inject(ActivatedRoute);

  private router = inject(Router);

  private registro = inject(RegistroService);

  correo = this.route.snapshot.queryParamMap.get('correo') ?? '';

  codigo = signal('');

  mensaje = signal('');

  esError = signal(false);

  cargando = signal(false);

  reenviando = signal(false);

  verificar(): void {
    const codigo = this.codigo().trim();

    if (!this.correo || !/^\d{6}$/.test(codigo)) {
      this.esError.set(true);

      this.mensaje.set('Ingresa el código de 6 dígitos.');

      return;
    }

    this.cargando.set(true);

    this.registro.verificarCorreo(this.correo, codigo).subscribe({
      next: () => {
        this.cargando.set(false);

        this.router.navigate(['/login']);
      },

      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);

        this.esError.set(true);

        this.mensaje.set(e.error?.detail || 'No fue posible verificar el código.');
      },
    });
  }

  reenviar(): void {
    if (!this.correo) {
      this.esError.set(true);

      this.mensaje.set('No se encontró el correo.');

      return;
    }

    this.reenviando.set(true);

    this.registro.reenviarCodigo(this.correo).subscribe({
      next: () => {
        this.reenviando.set(false);

        this.esError.set(false);

        this.mensaje.set('Te enviamos un nuevo código.');
      },

      error: (e: HttpErrorResponse) => {
        this.reenviando.set(false);

        this.esError.set(true);

        this.mensaje.set(e.error?.detail || 'No fue posible reenviar el código.');
      },
    });
  }
}
