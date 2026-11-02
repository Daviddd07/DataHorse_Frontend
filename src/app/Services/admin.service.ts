import { Injectable, inject } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

/* =====================================================
   RESUMEN DEL PANEL
===================================================== */

export interface CaballosPorRaza {
  raza: string;
  total: number;
}

export interface ResumenAdmin {
  usuarios: {
    total: number;
    activos: number;
    pendientes: number;
    administradores: number;
    nuevos_ultimos_30_dias: number;
  };
  caballos: {
    total: number;
    machos: number;
    yeguas: number;
    por_raza: CaballosPorRaza[];
  };
  publicaciones: {
    total: number;
    activas: number;
  };
  // Se configura en backend/app/config/settings.py (GRAFANA_URL); null oculta el botón
  enlaces?: {
    grafana: string | null;
  };
}

/* =====================================================
   USUARIO EN LA TABLA DEL PANEL
===================================================== */

export interface UsuarioAdmin {
  id_usuario: number;
  nombre: string;
  correo: string;
  rol: string;
  estado: string;
  fecha_registro: string;
  ciudad: string | null;
  departamento: string | null;
  caballos: number;
  machos: number;
  yeguas: number;
  publicaciones_activas: number;
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/api/v1/admin`;

  // GET /api/v1/admin/resumen
  obtenerResumen(): Observable<ResumenAdmin> {
    return this.http.get<ResumenAdmin>(`${this.apiUrl}/resumen`, { withCredentials: true });
  }

  // GET /api/v1/admin/usuarios
  listarUsuarios(): Observable<UsuarioAdmin[]> {
    return this.http.get<UsuarioAdmin[]>(`${this.apiUrl}/usuarios`, { withCredentials: true });
  }
}
