import {
  Component,
  inject
} from '@angular/core';

import {
  FormsModule
} from '@angular/forms';

import {
  Router,
  RouterLink
} from '@angular/router';

import {
  HttpErrorResponse
} from '@angular/common/http';

import {
  AuthService
} from '../../Services/auth.service';


@Component({
  selector:
    'app-recuperar-password',

  standalone: true,

  imports: [
    FormsModule,
    RouterLink
  ],

  template: `
    <main class="contenedor">

      <section class="card">

        <h1>
          Recuperar contraseña
        </h1>


        @if (paso === 1) {

          <p>
            Ingresa tu correo y te enviaremos
            un código de recuperación.
          </p>


          <input
            type="email"
            [(ngModel)]="correo"
            placeholder="Correo electrónico"
          />


          @if (mensaje) {
            <p
              [class.error]="error"
              [class.ok]="!error"
            >
              {{ mensaje }}
            </p>
          }


          <button
            type="button"
            (click)="enviarCodigo()"
            [disabled]="cargando"
          >
            {{
              cargando
                ? 'Enviando...'
                : 'Enviar código'
            }}
          </button>

        }


        @if (paso === 2) {

          <p>
            Escribe el código enviado a:
          </p>

          <strong>
            {{ correo }}
          </strong>


          <input
            type="text"
            [(ngModel)]="codigo"
            maxlength="6"
            inputmode="numeric"
            placeholder="Código de 6 dígitos"
          />


          <input
            type="password"
            [(ngModel)]="nuevaPassword"
            placeholder="Nueva contraseña"
          />


          <input
            type="password"
            [(ngModel)]="confirmarPassword"
            placeholder="Confirmar contraseña"
          />


          @if (mensaje) {
            <p
              [class.error]="error"
              [class.ok]="!error"
            >
              {{ mensaje }}
            </p>
          }


          <button
            type="button"
            (click)="cambiarPassword()"
            [disabled]="cargando"
          >
            {{
              cargando
                ? 'Actualizando...'
                : 'Cambiar contraseña'
            }}
          </button>

        }


        <a routerLink="/login">
          Volver al inicio de sesión
        </a>

      </section>

    </main>
  `,

  styles: [`
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
      box-shadow: 0 10px 35px
        rgba(0,0,0,.08);
      text-align: center;
    }

    input {
      box-sizing: border-box;
      width: 100%;
      padding: 13px;
      margin-top: 14px;
      border: 1px solid #ccc;
      border-radius: 9px;
    }

    button {
      width: 100%;
      padding: 13px;
      margin-top: 18px;
      border: 0;
      border-radius: 9px;
      cursor: pointer;
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
  `]
})
export class RecuperarPasswordComponent {

  private auth =
    inject(AuthService);

  private router =
    inject(Router);


  paso = 1;

  correo = '';

  codigo = '';

  nuevaPassword = '';

  confirmarPassword = '';

  mensaje = '';

  error = false;

  cargando = false;


  enviarCodigo(): void {

    const correo =
      this.correo
        .trim()
        .toLowerCase();


    if (!correo) {

      this.error = true;

      this.mensaje =
        'Ingresa tu correo.';

      return;
    }


    this.correo =
      correo;

    this.cargando =
      true;

    this.mensaje =
      '';


    this.auth
      .forgotPassword(
        correo
      )
      .subscribe({

        next: (
          respuesta
        ) => {

          this.cargando =
            false;

          this.error =
            false;

          this.mensaje =
            respuesta.mensaje;

          this.paso =
            2;
        },


        error: (
          e: HttpErrorResponse
        ) => {

          this.cargando =
            false;

          this.error =
            true;

          this.mensaje =
            e.error?.detail ||
            'No fue posible enviar el código.';
        }
      });
  }


  cambiarPassword(): void {

    if (
      !/^\d{6}$/.test(
        this.codigo.trim()
      )
    ) {

      this.error = true;

      this.mensaje =
        'El código debe tener 6 dígitos.';

      return;
    }


    if (
      this.nuevaPassword.length < 8
    ) {

      this.error = true;

      this.mensaje =
        'La contraseña debe tener mínimo 8 caracteres.';

      return;
    }


    if (
      this.nuevaPassword !==
      this.confirmarPassword
    ) {

      this.error = true;

      this.mensaje =
        'Las contraseñas no coinciden.';

      return;
    }


    this.cargando =
      true;


    this.auth
      .resetPassword(
        this.correo,
        this.codigo.trim(),
        this.nuevaPassword
      )
      .subscribe({

        next: () => {

          this.cargando =
            false;

          this.router.navigate([
            '/login'
          ]);
        },


        error: (
          e: HttpErrorResponse
        ) => {

          this.cargando =
            false;

          this.error =
            true;

          this.mensaje =
            e.error?.detail ||
            'No fue posible cambiar la contraseña.';
        }
      });
  }
}