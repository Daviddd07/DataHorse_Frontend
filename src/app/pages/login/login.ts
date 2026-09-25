import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../Services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  correo: string = '';
  password: string = '';
  mensaje: string = '';
  cargando: boolean = false;

  iniciarSesion(): void {
    if (!this.correo || !this.password) {
      this.mensaje = 'Debe ingresar correo y contraseña.';
      return;
    }

    this.mensaje = '';
    this.cargando = true;

    this.auth.login(this.correo, this.password).subscribe({
      next: () => {
        this.cargando = false;
        this.router.navigate(['/marketplace']);
      },
      error: (e: HttpErrorResponse) => {
        this.cargando = false;
        this.mensaje =
          e.status === 401
            ? 'Correo o contraseña incorrectos.'
            : 'No pudimos iniciar sesión. Inténtalo de nuevo.';
      },
    });
  }
}
