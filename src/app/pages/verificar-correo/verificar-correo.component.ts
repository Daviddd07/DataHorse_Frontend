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
      <section
        class="card"
        [class.shake-anim]="animandoError()"
        [class.success-anim]="animandoExito()"
      >
        <img src="Logo_blanco.png" alt="DataHorse" class="logo" />

        <h1>Verifica tu correo</h1>
        <p class="sub">Enviamos un código de 6 dígitos a:</p>
        <strong class="correo-destino">{{ correo }}</strong>

        <div class="input-wrapper">
          <input
            type="text"
            inputmode="numeric"
            maxlength="6"
            placeholder="000000"
            [ngModel]="codigo()"
            (ngModelChange)="onCodigoChange($event)"
            class="codigo-input"
            [class.invalido]="esError()"
            [class.exito]="exito()"
            [disabled]="cargando() || exito()"
          />

          @if (exito()) {
            <svg
              class="check-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          }
        </div>

        @if (mensaje()) {
          <!-- Usamos esError para mantener el color rojo independientemente de la animación -->
          <p class="mensaje" [class.error-msg]="esError()" [class.ok-msg]="exito()">
            {{ mensaje() }}
          </p>
        }

        <button
          type="button"
          class="primario"
          (click)="verificar()"
          [disabled]="cargando() || exito()"
        >
          {{ cargando() ? 'Verificando...' : exito() ? '¡Verificado!' : 'Verificar cuenta' }}
        </button>

        <button
          type="button"
          class="secundario"
          (click)="reenviar()"
          [disabled]="reenviando() || exito()"
        >
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

      @keyframes cardIn {
        from {
          opacity: 0;
          transform: translateY(30px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes shake {
        0%,
        100% {
          transform: translateX(0);
        }
        20% {
          transform: translateX(-10px);
        }
        40% {
          transform: translateX(10px);
        }
        60% {
          transform: translateX(-6px);
        }
        80% {
          transform: translateX(6px);
        }
      }

      @keyframes successPulse {
        0% {
          transform: scale(1);
          box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.5);
        }
        50% {
          transform: scale(1.02);
          box-shadow: 0 0 30px 10px rgba(74, 222, 128, 0.2);
        }
        100% {
          transform: scale(1);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
        }
      }

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
        animation: cardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        transition: border-color 0.3s ease;
      }

      .card.shake-anim {
        animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        border-color: rgba(255, 107, 107, 0.5);
      }

      .card.success-anim {
        animation: successPulse 0.8s ease-in-out both;
        border-color: rgba(74, 222, 128, 0.5);
      }

      .logo {
        display: block;
        margin: 0 auto 16px;
        width: 72px;
        height: 72px;
        object-fit: contain;
        filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5));
      }

      h1 {
        margin: 0 0 10px;
        font-size: 24px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: var(--text-main);
      }

      .sub {
        margin: 0 0 8px;
        font-size: 14px;
        color: var(--text-muted);
      }

      .correo-destino {
        display: block;
        font-size: 15px;
        font-weight: 600;
        color: var(--accent-gold);
        margin-bottom: 24px;
        word-break: break-all;
      }

      .input-wrapper {
        position: relative;
        margin-bottom: 20px;
      }

      .codigo-input {
        width: 100%;
        box-sizing: border-box;
        padding: 16px;
        font-size: 32px;
        font-weight: 700;
        font-family: monospace;
        text-align: center;
        letter-spacing: 12px;
        color: var(--text-main);
        background-color: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        outline: none;
        transition: all 0.3s ease;
      }

      .codigo-input::placeholder {
        color: rgba(255, 255, 255, 0.2);
      }

      .codigo-input:focus {
        border-color: var(--accent-gold);
        background-color: rgba(0, 0, 0, 0.5);
        box-shadow: 0 0 0 3px rgba(230, 168, 23, 0.15);
      }

      .codigo-input.invalido {
        border-color: #ff6b6b;
        color: #ff6b6b;
      }
      .codigo-input.invalido:focus {
        box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.15);
      }

      .codigo-input.exito {
        border-color: #4ade80;
        color: #4ade80;
        background-color: rgba(74, 222, 128, 0.1);
      }

      .check-icon {
        position: absolute;
        right: 15px;
        top: 50%;
        transform: translateY(-50%) scale(0);
        width: 28px;
        height: 28px;
        color: #4ade80;
        animation: popCheck 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      @keyframes popCheck {
        to {
          transform: translateY(-50%) scale(1);
        }
      }

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

      .primario {
        width: 100%;
        height: 46px;
        padding: 0 12px;
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

      .primario:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .secundario {
        width: 100%;
        height: 46px;
        margin-top: 12px;
        padding: 0 12px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        background-color: transparent;
        color: var(--text-muted);
        font-family: inherit;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .secundario:hover:not(:disabled) {
        background-color: rgba(255, 255, 255, 0.1);
        color: var(--text-main);
      }

      .secundario:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .pie {
        margin: 24px 0 0;
        font-size: 13px;
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
export class VerificarCorreoComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private registro = inject(RegistroService);

  correo = this.route.snapshot.queryParamMap.get('correo') ?? '';

  codigo = signal('');
  mensaje = signal('');

  // Señales de estado
  esError = signal(false);
  exito = signal(false);
  cargando = signal(false);
  reenviando = signal(false);

  // Señales para controlar las animaciones temporalmente
  animandoError = signal(false);
  animandoExito = signal(false);

  // Limpia el mensaje y los errores cuando el usuario empieza a escribir de nuevo
  onCodigoChange(value: string): void {
    this.codigo.set(value);
    if (this.esError()) {
      this.esError.set(false);
      this.mensaje.set('');
    }
  }

  private triggerErrorAnimacion(msg: string): void {
    this.esError.set(true);
    this.exito.set(false);
    this.mensaje.set(msg);
    this.animandoError.set(true);

    // Quita la animación de la tarjeta a los 500ms
    setTimeout(() => this.animandoError.set(false), 500);

    // Borra el mensaje de error a los 3 segundos
    setTimeout(() => {
      if (this.esError()) {
        this.esError.set(false);
        this.mensaje.set('');
      }
    }, 3000);
  }

  verificar(): void {
    const codigoStr = this.codigo().trim();

    if (!this.correo || !/^\d{6}$/.test(codigoStr)) {
      this.triggerErrorAnimacion('Ingresa el c\u00f3digo de 6 d\u00edgitos.');
      return;
    }

    this.cargando.set(true);
    this.mensaje.set('');
    this.esError.set(false);
    this.exito.set(false);

    this.registro.verificarCorreo(this.correo, codigoStr).subscribe({
      next: () => {
        this.cargando.set(false);

        // Éxito
        this.exito.set(true);
        this.mensaje.set('\u00a1C\u00f3digo correcto! Redirigiendo...');
        this.animandoExito.set(true);

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1500);
      },
      error: (e: HttpErrorResponse) => {
        this.cargando.set(false);

        // Parche por si el backend envía la 'ó' rota (CÃ³digo)
        let errorMsg = e.error?.detail || 'C\u00f3digo incorrecto o expirado.';
        if (errorMsg.includes('Ã³')) {
          errorMsg = errorMsg.replace(/Ã³/g, 'ó');
        }

        this.triggerErrorAnimacion(errorMsg);
      },
    });
  }

  reenviar(): void {
    if (!this.correo) {
      this.triggerErrorAnimacion('No se encontr\u00f3 el correo.');
      return;
    }

    this.reenviando.set(true);
    this.esError.set(false);
    this.exito.set(false);
    this.mensaje.set('');

    this.registro.reenviarCodigo(this.correo).subscribe({
      next: () => {
        this.reenviando.set(false);

        // Éxito visual por 2 segundos
        this.exito.set(true);
        this.mensaje.set('Te enviamos un nuevo c\u00f3digo.');
        this.animandoExito.set(true);

        setTimeout(() => {
          this.exito.set(false);
          this.animandoExito.set(false);
          this.mensaje.set('');
        }, 2000);
      },
      error: (e: HttpErrorResponse) => {
        this.reenviando.set(false);

        let errorMsg = e.error?.detail || 'No fue posible reenviar el c\u00f3digo.';
        if (errorMsg.includes('Ã³')) {
          errorMsg = errorMsg.replace(/Ã³/g, 'ó');
        }

        this.triggerErrorAnimacion(errorMsg);
      },
    });
  }
}
