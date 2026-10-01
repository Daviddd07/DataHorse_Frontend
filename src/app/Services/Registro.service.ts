import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


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
  estado: string;
  requiere_verificacion: boolean;
  correo_enviado: boolean;
  mensaje: string;
}


@Injectable({
  providedIn: 'root'
})
export class RegistroService {

  private http = inject(HttpClient);

  private readonly apiUrl =
    'http://localhost:8000/auth';


  registrar(
    datos: RegistroRequest
  ): Observable<RegistroResponse> {

    const {
      contrasena,
      ...resto
    } = datos;


    return this.http.post<RegistroResponse>(
      `${this.apiUrl}/register`,
      {
        ...resto,
        password: contrasena
      },
      {
        withCredentials: true
      }
    );
  }


  verificarCorreo(
    correo: string,
    codigo: string
  ): Observable<{ mensaje: string }> {

    return this.http.post<{ mensaje: string }>(
      `${this.apiUrl}/verify-email`,
      {
        correo,
        codigo
      },
      {
        withCredentials: true
      }
    );
  }


  reenviarCodigo(
    correo: string
  ): Observable<{ mensaje: string }> {

    return this.http.post<{ mensaje: string }>(
      `${this.apiUrl}/resend-code`,
      {
        correo
      },
      {
        withCredentials: true
      }
    );
  }
}