import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { RegistroService } from './Registro.service';

// Contraseña: mayúscula + minúscula + número.
const contrasenaSegura: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const v: string = c.value ?? '';
  return /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v) ? null : { debil: true };
};

// Confirmación igual a la contraseña.
const coinciden: ValidatorFn = (g: AbstractControl): ValidationErrors | null =>
  g.get('contrasena')?.value === g.get('confirmar')?.value ? null : { noCoinciden: true };

type Campo = 'nombre' | 'correo' | 'contrasena' | 'confirmar' | 'telefono' | 'ubicacion';

@Component({
  selector: 'app-registrar',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registrar.component.html',
  styleUrl: './registrar.component.css',
})
export class RegistrarComponent {
  private fb = inject(FormBuilder).nonNullable;
  private servicio = inject(RegistroService);

  cargando = signal(false);
  verPass = signal(false);
  verConfirmar = signal(false);
  mensaje = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Longitudes máximas iguales a las columnas de la tabla Usuario.
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
    { validators: coinciden },
  );

  // Se incrementa con cada cambio del formulario para que la pantalla se redibuje
  // (necesario cuando la app funciona sin zone.js).
  private version = signal(0);

  constructor() {
    this.form.events.pipe(takeUntilDestroyed()).subscribe(() => this.version.update((n) => n + 1));
  }

  get fuerza(): number {
    this.version();
    const p = this.form.controls.contrasena.value;
    let n = 0;
    if (p.length >= 8) n++;
    if (p.length >= 12) n++;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) n++;
    if (/\d/.test(p)) n++;
    if (/[^A-Za-z0-9]/.test(p)) n++;
    return n;
  }

  // Mensaje de error de un campo (solo si ya lo tocó o intentó enviar).
  error(campo: Campo): string {
    this.version();
    const c = this.form.controls[campo];
    if (!(c.touched || c.dirty)) return '';
    if (campo === 'confirmar' && this.form.hasError('noCoinciden') && c.value)
      return 'Las contraseñas no coinciden.';
    if (c.hasError('required')) return 'Este campo es obligatorio.';
    if (c.hasError('minlength'))
      return `Usa al menos ${c.getError('minlength').requiredLength} caracteres.`;
    if (c.hasError('maxlength'))
      return `Máximo ${c.getError('maxlength').requiredLength} caracteres.`;
    if (c.hasError('debil')) return 'Incluye mayúscula, minúscula y número.';
    if (c.hasError('pattern'))
      return campo === 'correo'
        ? 'Escribe un correo válido.'
        : 'Usa solo números, espacios, + ( ) y -.';
    return '';
  }

  enviar(): void {
    this.mensaje.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mensaje.set({ tipo: 'error', texto: 'Revisa los campos marcados.' });
      return;
    }

    const v = this.form.getRawValue();
    this.cargando.set(true);
    this.servicio
      .registrar({
        nombre: v.nombre.trim(),
        correo: v.correo.trim().toLowerCase(),
        contrasena: v.contrasena,
        telefono: v.telefono.trim() || null,
        ubicacion: v.ubicacion.trim() || null,
      })
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: () => {
          this.form.reset();
          this.mensaje.set({ tipo: 'ok', texto: 'Cuenta creada. Ya puedes iniciar sesión.' });
        },
        error: (e: HttpErrorResponse) => {
          // Mensajes genéricos: no revelan si el correo ya existe.
          const texto =
            e.status === 429
              ? 'Demasiados intentos. Espera unos minutos.'
              : e.status === 0
                ? 'Sin conexión con el servidor. Inténtalo más tarde.'
                : 'No pudimos crear la cuenta. Revisa los datos e inténtalo de nuevo.';
          this.mensaje.set({ tipo: 'error', texto });
        },
      });
  }
}
