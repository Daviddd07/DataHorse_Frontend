import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  ViewChild,
  inject
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

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


declare global {
  interface Window {
    google: any;
  }
}


const GOOGLE_CLIENT_ID =
  '698630764703-nsr0e739j8qnt2b6lkqg2uft417n5jl3.apps.googleusercontent.com';


@Component({
  selector: 'app-login',

  standalone: true,

  imports: [
    FormsModule,
    CommonModule,
    RouterLink
  ],

  templateUrl: './login.html',

  styleUrl: './login.css'
})
export class Login
  implements AfterViewInit {


  @ViewChild('googleButton')
  googleButton!:
    ElementRef<HTMLDivElement>;


  private auth =
    inject(AuthService);

  private router =
    inject(Router);

  private zone =
    inject(NgZone);


  correo = '';

  password = '';

  mensaje = '';

  cargando = false;

  cargandoGoogle = false;

  necesitaVerificacion = false;


  ngAfterViewInit(): void {

    this.inicializarGoogle();
  }


  private inicializarGoogle(
    intento = 0
  ): void {

    if (
      !window.google?.accounts?.id
    ) {

      if (intento < 30) {

        setTimeout(
          () =>
            this.inicializarGoogle(
              intento + 1
            ),
          250
        );
      }

      return;
    }


    window.google.accounts.id.initialize({

      client_id:
        GOOGLE_CLIENT_ID,

      callback:
        (respuesta: any) => {

          this.zone.run(
            () =>
              this.iniciarConGoogle(
                respuesta.credential
              )
          );
        }
    });


    window.google.accounts.id.renderButton(
      this.googleButton.nativeElement,
      {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: 320
      }
    );
  }


  iniciarConGoogle(
    credential: string
  ): void {

    if (!credential)
      return;


    this.mensaje = '';

    this.cargandoGoogle = true;


    this.auth
      .google(credential)
      .subscribe({

        next: () => {

          this.cargandoGoogle = false;

          this.router.navigate([
            '/marketplace'
          ]);
        },


        error: (
          e: HttpErrorResponse
        ) => {

          this.cargandoGoogle = false;

          this.mensaje =
            e.error?.detail ||
            'No fue posible iniciar sesión con Google.';
        }
      });
  }


  iniciarSesion(): void {

    if (
      !this.correo ||
      !this.password
    ) {

      this.mensaje =
        'Debe ingresar correo y contraseña.';

      return;
    }


    this.mensaje = '';

    this.necesitaVerificacion =
      false;

    this.cargando =
      true;


    this.auth
      .login(
        this.correo.trim().toLowerCase(),
        this.password
      )
      .subscribe({

        next: () => {

          this.cargando = false;

          this.router.navigate([
            '/marketplace'
          ]);
        },


        error: (
          e: HttpErrorResponse
        ) => {

          this.cargando = false;


          if (e.status === 403) {

            this.mensaje =
              'Debes verificar tu correo antes de iniciar sesión.';

            this.necesitaVerificacion =
              true;

            return;
          }


          this.mensaje =
            e.status === 401
              ? 'Correo o contraseña incorrectos.'
              : (
                  e.error?.detail ||
                  'No pudimos iniciar sesión.'
                );
        }
      });
  }
}