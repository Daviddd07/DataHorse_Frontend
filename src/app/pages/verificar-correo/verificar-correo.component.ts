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

        <p>Enviamos un código de 6 dígitos a:</p>

        <strong>
          {{ correo }}
        </strong>

        <input
          type="text"
          inputmode="numeric"
          maxlength="6"
          placeholder="000000"
          [ngModel]="codigo()"
          (ngModelChange)="codigo.set($event)"
        />

        @if (mensaje()) {
          <p [class.error]="esError()" [class.ok]="!esError()">
            {{ mensaje() }}
          </p>
        }

        <button type="button" (click)="verificar()" [disabled]="cargando()">
          {{ cargando() ? 'Verificando...' : 'Verificar cuenta' }}
        </button>

        <button type="button" class="secundario" (click)="reenviar()" [disabled]="reenviando()">
          {{ reenviando() ? 'Enviando...' : 'Reenviar código' }}
        </button>

        <a routerLink="/login"> Volver al inicio de sesión </a>
      </section>
    </main>
  `,

  styles: [
    `
      .contenedor {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background: #f5f5f7;
      }

      .card {
        width: min(420px, 100%);
        background: white;
        padding: 32px;
        border-radius: 18px;
        box-shadow: 0 10px 35px rgba(0, 0, 0, 0.08);
        text-align: center;
      }

      input {
        box-sizing: border-box;
        width: 100%;
        margin: 25px 0 15px;
        padding: 16px;
        font-size: 28px;
        text-align: center;
        letter-spacing: 10px;
        border: 1px solid #ccc;
        border-radius: 10px;
      }

      button {
        width: 100%;
        padding: 13px;
        margin-top: 10px;
        border: 0;
        border-radius: 10px;
        cursor: pointer;
      }

      .secundario {
        background: #eee;
      }

      a {
        display: inline-block;
        margin-top: 20px;
      }

      .error {
        color: #b91c1c;
      }

      .ok {
        color: #15803d;
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
