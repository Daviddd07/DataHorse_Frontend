import { Injectable } from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';


export interface UsuarioSesion {
  id: number;
  correo: string;
  nombre: string;
}


export interface GoogleAuthResponse {

  mensaje: string;

  usuario: {
    id: number;
    correo: string;
    nombre: string;
  };
}


@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly apiUrl =
    'http://localhost:8000';


  constructor(
    private http: HttpClient
  ) {}


  // =====================================================
  // LOGIN NORMAL
  // =====================================================

  login(
    correo: string,
    contrasena: string
  ): Observable<{ mensaje: string }> {

    return this.http.post<{ mensaje: string }>(
      `${this.apiUrl}/auth/login`,

      {
        correo: correo,
        password: contrasena
      },

      {
        withCredentials: true
      }
    );
  }


  // =====================================================
  // LOGIN / REGISTRO CON GOOGLE
  // =====================================================

  google(
    credential: string
  ): Observable<GoogleAuthResponse> {

    return this.http.post<GoogleAuthResponse>(
      `${this.apiUrl}/auth/google`,

      {
        credential: credential
      },

      {
        withCredentials: true
      }
    );
  }


  // =====================================================
  // OLVIDÉ MI CONTRASEÑA
  // =====================================================

  forgotPassword(
    correo: string
  ): Observable<{ mensaje: string }> {

    return this.http.post<{ mensaje: string }>(
      `${this.apiUrl}/auth/forgot-password`,

      {
        correo: correo
      },

      {
        withCredentials: true
      }
    );
  }


  // =====================================================
  // RESTABLECER / CREAR CONTRASEÑA
  // =====================================================

  resetPassword(
    correo: string,
    codigo: string,
    nuevaPassword: string
  ): Observable<{ mensaje: string }> {

    return this.http.post<{ mensaje: string }>(
      `${this.apiUrl}/auth/reset-password`,

      {
        correo: correo,
        codigo: codigo,
        nueva_password: nuevaPassword
      },

      {
        withCredentials: true
      }
    );
  }


  // =====================================================
  // USUARIO ACTUAL
  // =====================================================

  me(): Observable<UsuarioSesion> {

    return this.http.get<UsuarioSesion>(
      `${this.apiUrl}/auth/me`,

      {
        withCredentials: true
      }
    );
  }


  // =====================================================
  // CERRAR SESIÓN
  // =====================================================

  logout(): Observable<{ mensaje: string }> {

    return this.http.post<{ mensaje: string }>(
      `${this.apiUrl}/auth/logout`,

      {},

      {
        withCredentials: true
      }
    );
  }
}