import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Datos que ingresa el usuario
export interface RegistroRequest {
  nombre: string;
  correo: string;
  contrasena: string;
  telefono: string | null;
  ubicacion: string | null;
}

export interface RegistroResponse {
  id: number;
  nombre: string;
  correo: string;
}

@Injectable({ providedIn: 'root' })
export class RegistroService {

  private http = inject(HttpClient);

  private readonly url = 'http://127.0.0.1:8000/auth/register';

  registrar(datos: RegistroRequest): Observable<RegistroResponse> {

    const { contrasena, ...resto } = datos;

    return this.http.post<RegistroResponse>(
      this.url,
      {
        ...resto,
        password: contrasena
      }
    );
  }
}
