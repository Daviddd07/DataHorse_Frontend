import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Solo los datos que controla el usuario.
// id_usuario, id_rol, estado y fecha_registro los asigna el BACKEND.
export interface RegistroRequest {
  nombre: string;
  correo: string;
  contrasena: string;
  telefono: string | null;
  ubicacion: string | null;
}

@Injectable({ providedIn: 'root' })
export class RegistroService {
  private http = inject(HttpClient);

  // Backend FastAPI en local. En producción usa HTTPS y mueve esto a environment.
  private readonly url = 'http://127.0.0.1:8000/api/v1/auth/registro';

  registrar(datos: RegistroRequest): Observable<void> {
    const { contrasena, ...resto } = datos;
    // El backend espera el campo "password".
    return this.http.post<void>(this.url, { ...resto, password: contrasena });
  }
}
