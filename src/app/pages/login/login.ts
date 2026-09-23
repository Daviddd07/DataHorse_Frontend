import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
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

    // Aquí luego conectas el LoginUseCase / AuthPort en vez de este console.log
    console.log('Intento de login para:', this.correo);

    // Simulación temporal hasta conectar el backend:
    this.cargando = false;
  }
}
