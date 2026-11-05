import { Injectable, inject } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable, map } from 'rxjs';

import { environment } from '../../environments/environment';

export interface Perfil {
  id: number;
  nombre: string;
  correo: string;
  telefono: string | null;
  ciudad: string | null;
  departamento: string | null;
  fecha_registro: string | null; // 'YYYY-MM-DD'
  es_admin: boolean;
  solo_google: boolean; // entró con Google y aún no creó su contraseña
  foto_perfil: string | null; // ruta pública ('/uploads/perfiles/...')
}

// Mismas reglas que valida el backend (el servidor además comprueba que sea una imagen real)
export const FOTO_TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
export const FOTO_MAX_BYTES = 5 * 1024 * 1024;

// URL completa de una ruta de /uploads (o null si no hay foto)
export function urlDeSubida(ruta: string | null | undefined): string | null {
  return ruta ? `${environment.uploadsUrl}${ruta}` : null;
}

// Lo único editable del perfil (el correo, el rol y el estado no se pueden cambiar)
export interface CambiosPerfil {
  nombre: string;
  telefono: string | null;
  ciudad: string | null;
  departamento: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class CuentaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/v1`;

  obtenerPerfil(): Observable<Perfil> {
    return this.http.get<Perfil>(`${this.apiUrl}/cuenta/perfil`, { withCredentials: true });
  }

  actualizarPerfil(cambios: CambiosPerfil): Observable<Perfil> {
    return this.http.patch<Perfil>(`${this.apiUrl}/cuenta/perfil`, cambios, {
      withCredentials: true,
    });
  }

  // El servidor la recorta en un cuadrado, la reduce y le quita los metadatos
  subirFoto(foto: File): Observable<Perfil> {
    const datos = new FormData();
    datos.append('foto', foto, foto.name);
    return this.http.put<Perfil>(`${this.apiUrl}/cuenta/foto`, datos, { withCredentials: true });
  }

  quitarFoto(): Observable<Perfil> {
    return this.http.delete<Perfil>(`${this.apiUrl}/cuenta/foto`, { withCredentials: true });
  }

  // Sugerencias de ubicación (departamentos y ciudades donde ya hay caballos registrados)
  sugerirDepartamentos(): Observable<string[]> {
    return this.http
      .get<{ departamento: string }[]>(`${this.apiUrl}/caballos/ubicaciones/departamentos`, {
        withCredentials: true,
      })
      .pipe(map((filas) => filas.map((f) => f.departamento)));
  }

  sugerirCiudades(departamento: string): Observable<string[]> {
    return this.http
      .get<{ ciudad: string }[]>(`${this.apiUrl}/caballos/ubicaciones/ciudades`, {
        params: { departamento },
        withCredentials: true,
      })
      .pipe(map((filas) => filas.map((f) => f.ciudad)));
  }
}
