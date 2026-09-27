import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Raza {
  id_raza: number;
  nombre: string;
  descripcion: string | null;
}

export interface NuevaPublicacion {
  nombre: string;
  sexo: 'Macho' | 'Hembra';
  fecha_nacimiento: string; // 'YYYY-MM-DD'
  altura: number;
  color: string;
  ubicacion: string;
  descripcion: string;
  disponibilidad: 'Disponible' | 'No disponible';
  id_raza?: number;
  raza_personalizada?: string;
  titulo?: string; // obligatorio cuando sexo === 'Macho'
  precio?: number; // obligatorio cuando sexo === 'Macho'
}

export interface Caballo extends NuevaPublicacion {
  id_caballo: number;
  id_propietario: number;
}

export interface FiltrosCaballos {
  id_raza?: number;
  disponibilidad?: 'Disponible' | 'No disponible';
  precio_min?: number;
  precio_max?: number;
}

// Lo que realmente devuelve GET /api/v1/caballos: la Publicacion ya unida
// (JOIN) con su Caballo y Raza, no el Caballo crudo.
export interface PublicacionListItem {
  id_publicacion: number;
  id_caballo: number;
  titulo: string;
  nombre: string;
  raza: string;
  sexo: string;
  color: string;
  ubicacion: string;
  precio_referencia: number;
  estado: string;
  fecha_publicacion: string;
  foto_principal?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class CaballoService {
  private apiUrl = 'http://localhost:8000/api/v1';

  constructor(private http: HttpClient) {}

  listarRazas(): Observable<Raza[]> {
    return this.http.get<Raza[]>(`${this.apiUrl}/razas`, { withCredentials: true });
  }

  listar(filtros: FiltrosCaballos = {}): Observable<PublicacionListItem[]> {
    let params = new HttpParams();
    if (filtros.id_raza != null) params = params.set('id_raza', filtros.id_raza);
    if (filtros.disponibilidad) params = params.set('disponibilidad', filtros.disponibilidad);
    if (filtros.precio_min != null) params = params.set('precio_min', filtros.precio_min);
    if (filtros.precio_max != null) params = params.set('precio_max', filtros.precio_max);

    return this.http.get<PublicacionListItem[]>(`${this.apiUrl}/caballos`, {
      params,
      withCredentials: true,
    });
  }

  crear(datos: NuevaPublicacion): Observable<Caballo> {
    return this.http.post<Caballo>(`${this.apiUrl}/caballos`, datos, { withCredentials: true });
  }
  subirFotos(idCaballo: number, archivos: File[]): Observable<FotoCaballo[]> {
    const formData = new FormData();
    archivos.forEach((a) => formData.append('files', a));
    return this.http.post<FotoCaballo[]>(`${this.apiUrl}/caballos/${idCaballo}/fotos`, formData, {
      withCredentials: true,
    });
  }
}
export interface FotoCaballo {
  id_foto: number;
  ruta: string;
  es_principal: boolean;
  orden: number;
  fecha_subida?: string;
}
