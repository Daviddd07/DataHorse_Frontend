import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://127.0.0.1:8000/api/v1';

  constructor(private http: HttpClient) {}

  login(correo: string, contraseña: string) {
    return this.http.post(`${this.apiUrl}/auth/login`, {
      correo: correo,
      contraseña: contraseña,
    });
  }
}
