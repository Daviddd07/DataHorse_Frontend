import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UsuarioSesion {
  id: number;
  correo: string;
  nombre: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:8000/api/v1';

  constructor(private http: HttpClient) {}

  login(correo: string, contrasena: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(
      `${this.apiUrl}/auth/login`,
      { correo, password: contrasena },
      { withCredentials: true },
    );
  }

  me(): Observable<UsuarioSesion> {
    return this.http.get<UsuarioSesion>(`${this.apiUrl}/auth/me`, {
      withCredentials: true,
    });
  }
}
