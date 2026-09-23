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

  // Cámbiala por environment.apiUrl + '/usuarios/registro' (siempre HTTPS en producción).
  private readonly url = '/api/usuarios/registro';

  registrar(datos: RegistroRequest): Observable<void> {
    return this.http.post<void>(this.url, datos);
  }
}
