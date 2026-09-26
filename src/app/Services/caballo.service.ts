import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
}

export interface Caballo extends NuevaPublicacion {
  id_caballo: number;
  id_propietario: number;
}

@Injectable({
  providedIn: 'root',
})
export class CaballoService {

  private apiUrl = 'http://localhost:8000';
  constructor(private http: HttpClient) {}

  listarRazas(): Observable<Raza[]> {
    return this.http.get<Raza[]>(`${this.apiUrl}/razas`, { withCredentials: true });
  }

  crear(datos: NuevaPublicacion): Observable<Caballo> {
    return this.http.post<Caballo>(`${this.apiUrl}/caballos`, datos, { withCredentials: true });
  }
}
