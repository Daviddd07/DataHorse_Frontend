import { Injectable } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable, catchError, map, of, shareReplay, tap, throwError } from 'rxjs';

import { environment } from '../../environments/environment';

export interface UsuarioSesion {
  id: number;
  correo: string;
  nombre: string;
  es_admin?: boolean;
  foto_perfil?: string | null; // ruta pública ('/uploads/perfiles/...')
}

export interface GoogleAuthResponse {
  mensaje: string;

  // true si la cuenta solo puede entrar con Google (aún no creó su contraseña)
  requiere_contrasena?: boolean;

  usuario: {
    id: number;
    correo: string;
    nombre: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // =====================================================
  // LOGIN NORMAL
  // =====================================================

  login(correo: string, contrasena: string): Observable<{ mensaje: string }> {
    return this.http
      .post<{ mensaje: string }>(
        `${this.apiUrl}/auth/login`,

        {
          correo: correo,
          password: contrasena,
        },

        {
          withCredentials: true,
        },
      )
      .pipe(tap(() => this.olvidarUsuario()));
  }

  // =====================================================
  // LOGIN / REGISTRO CON GOOGLE
  // =====================================================

  google(credential: string): Observable<GoogleAuthResponse> {
    return this.http
      .post<GoogleAuthResponse>(
        `${this.apiUrl}/auth/google`,

        {
          credential: credential,
        },

        {
          withCredentials: true,
        },
      )
      .pipe(tap(() => this.olvidarUsuario()));
  }

  // =====================================================
  // OLVIDÉ MI CONTRASEÑA
  // =====================================================

  forgotPassword(correo: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(
      `${this.apiUrl}/auth/forgot-password`,

      {
        correo: correo,
      },

      {
        withCredentials: true,
      },
    );
  }

  // =====================================================
  // RESTABLECER / CREAR CONTRASEÑA
  // =====================================================

  resetPassword(
    correo: string,
    codigo: string,
    nuevaPassword: string,
  ): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(
      `${this.apiUrl}/auth/reset-password`,

      {
        correo: correo,
        codigo: codigo,
        nueva_password: nuevaPassword,
      },

      {
        withCredentials: true,
      },
    ).pipe(tap(() => this.olvidarUsuario()));
  }

  // =====================================================
  // USUARIO ACTUAL
  // =====================================================

  // El guard de la ruta y la página piden el usuario casi a la vez: con esta caché
  // corta comparten UNA petición. Es corta a propósito: en cada navegación
  // posterior se vuelve a comprobar que la sesión siga viva.
  private static readonly CACHE_ME_MS = 5000;

  private meEnCurso: Observable<UsuarioSesion> | null = null;

  private meDesde = 0;

  me(): Observable<UsuarioSesion> {
    const vigente = this.meEnCurso && Date.now() - this.meDesde < AuthService.CACHE_ME_MS;

    if (!vigente) {
      this.meDesde = Date.now();

      this.meEnCurso = this.http
        .get<UsuarioSesion>(`${this.apiUrl}/auth/me`, { withCredentials: true })
        .pipe(
          // Un error (p. ej. sesión vencida) no se guarda: la próxima vez se pregunta de nuevo
          catchError((error: unknown) => {
            this.olvidarUsuario();
            return throwError(() => error);
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }

    return this.meEnCurso!;
  }

  /** Descarta el usuario guardado (al iniciar o cerrar sesión, o si cambian sus datos). */
  olvidarUsuario(): void {
    this.meEnCurso = null;
    this.meDesde = 0;
  }

  // =====================================================
  // A DÓNDE IR DESPUÉS DE INICIAR SESIÓN
  // =====================================================

  // El administrador elige entre el panel y el marketplace; el resto va directo al marketplace.
  destinoTrasLogin(): Observable<string> {
    return this.me().pipe(
      map((usuario) => (usuario.es_admin ? '/admin/elegir' : '/marketplace')),
      catchError(() => of('/marketplace')),
    );
  }

  // =====================================================
  // CERRAR SESIÓN
  // =====================================================

  logout(): Observable<{ mensaje: string }> {
    // Se olvida antes de salir: aunque falle la petición, no debe quedar un usuario guardado
    this.olvidarUsuario();

    return this.http.post<{ mensaje: string }>(
      `${this.apiUrl}/auth/logout`,

      {},

      {
        withCredentials: true,
      },
    );
  }
}
