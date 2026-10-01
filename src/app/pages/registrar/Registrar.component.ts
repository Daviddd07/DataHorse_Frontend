import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  ViewChild,
  inject,
  signal,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import { Router, RouterLink } from '@angular/router';

import { HttpErrorResponse } from '@angular/common/http';

import { finalize } from 'rxjs';

import { RegistroService } from '../../Services/Registro.service';

import { AuthService } from '../../Services/auth.service';

declare global {
  interface Window {
    google: any;
  }
}

const GOOGLE_CLIENT_ID = '698630764703-nsr0e739j8qnt2b6lkqg2uft417n5jl3.apps.googleusercontent.com';

const contrasenaSegura: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const valor: string = control.value ?? '';

  return /[a-z]/.test(valor) && /[A-Z]/.test(valor) && /\d/.test(valor) ? null : { debil: true };
};

const coinciden: ValidatorFn = (grupo: AbstractControl): ValidationErrors | null => {
  return grupo.get('contrasena')?.value === grupo.get('confirmar')?.value
    ? null
    : { noCoinciden: true };
};

type Campo = 'nombre' | 'correo' | 'contrasena' | 'confirmar' | 'telefono' | 'ubicacion';

@Component({
  selector: 'app-registrar',

  standalone: true,

  imports: [ReactiveFormsModule, RouterLink],

  templateUrl: './registrar.component.html',

  styleUrl: './registrar.component.css',
})
export class RegistrarComponent implements AfterViewInit {
  @ViewChild('googleButton')
  googleButton!: ElementRef<HTMLDivElement>;

  private fb = inject(FormBuilder).nonNullable;

  private registro = inject(RegistroService);

  private auth = inject(AuthService);

  private router = inject(Router);

  private zone = inject(NgZone);

  cargando = signal(false);

  cargandoGoogle = signal(false);

  verPass = signal(false);

  verConfirmar = signal(false);

  mensaje = signal<{
    tipo: 'ok' | 'error';
    texto: string;
  } | null>(null);

  form = this.fb.group(
    {
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],

      correo: [
        '',
        [
          Validators.required,
          Validators.maxLength(180),
          Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/),
        ],
      ],

      contrasena: [
        '',
        [Validators.required, Validators.minLength(8), Validators.maxLength(64), contrasenaSegura],
      ],

      confirmar: ['', [Validators.required]],

      telefono: ['', [Validators.maxLength(30), Validators.pattern(/^(\+?[0-9 ()-]{7,30})?$/)]],

      ubicacion: ['', [Validators.maxLength(180)]],
    },

    {
      validators: coinciden,
    },
  );

  private version = signal(0);

  constructor() {
    this.form.events.pipe(takeUntilDestroyed()).subscribe(() => this.version.update((n) => n + 1));
  }

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

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,

      callback: (respuesta: any) => {
        this.zone.run(() => this.loginGoogle(respuesta.credential));
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

  private loginGoogle(credential: string): void {
    if (!credential) {
      return;
    }

    this.cargandoGoogle.set(true);

    this.mensaje.set(null);

    this.auth
      .google(credential)

      .pipe(finalize(() => this.cargandoGoogle.set(false)))

      .subscribe({
        next: () => {
          this.router.navigate(['/marketplace']);
        },

        error: (e: HttpErrorResponse) => {
          this.mensaje.set({
            tipo: 'error',
            texto: e.error?.detail || 'No fue posible continuar con Google.',
          });
        },
      });
  }

  get fuerza(): number {
    this.version();

    const password = this.form.controls.contrasena.value;

    let puntos = 0;

    if (password.length >= 8) puntos++;

    if (password.length >= 12) puntos++;

    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) puntos++;

    if (/\d/.test(password)) puntos++;

    if (/[^A-Za-z0-9]/.test(password)) puntos++;

    return puntos;
  }

  error(campo: Campo): string {
    this.version();

    const control = this.form.controls[campo];

    if (!control.touched && !control.dirty) {
      return '';
    }

    if (campo === 'confirmar' && this.form.hasError('noCoinciden') && control.value) {
      return 'Las contraseñas no coinciden.';
    }

    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (control.hasError('minlength')) {
      return `Usa al menos ${control.getError('minlength').requiredLength} caracteres.`;
    }

    if (control.hasError('maxlength')) {
      return `Máximo ${control.getError('maxlength').requiredLength} caracteres.`;
    }

    if (control.hasError('debil')) {
      return 'Incluye mayúscula, minúscula y número.';
    }

    if (control.hasError('pattern')) {
      return campo === 'correo'
        ? 'Escribe un correo válido.'
        : 'Usa solo números, espacios, + ( ) y -.';
    }

    return '';
  }

  enviar(): void {
    this.mensaje.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();

      this.mensaje.set({
        tipo: 'error',
        texto: 'Revisa los campos marcados.',
      });

      return;
    }

    const datos = this.form.getRawValue();

    const correo = datos.correo.trim().toLowerCase();

    this.cargando.set(true);

    this.registro
      .registrar({
        nombre: datos.nombre.trim(),

        correo,

        contrasena: datos.contrasena,

        telefono: datos.telefono.trim() || null,

        ubicacion: datos.ubicacion.trim() || null,
      })

      .pipe(finalize(() => this.cargando.set(false)))

      .subscribe({
        next: () => {
          this.router.navigate(['/verificar-correo'], {
            queryParams: {
              correo,
            },
          });
        },

        error: (e: HttpErrorResponse) => {
          let texto = 'No pudimos crear la cuenta.';

          if (e.status === 409) {
            texto = 'Ese correo ya está registrado.';
          } else if (e.status === 0) {
            texto = 'No hay conexión con el servidor.';
          } else if (e.error?.detail) {
            texto = e.error.detail;
          }

          this.mensaje.set({
            tipo: 'error',
            texto,
          });
        },
      });
  }
}
