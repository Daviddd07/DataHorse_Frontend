import { Injectable, inject } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

/* =====================================================
   ESTIMACIONES DISPONIBLES HOY
===================================================== */

export interface CupoCompatibilidad {
  limite: number;
  usadas: number;
  restantes: number;
}

/* =====================================================
   RESULTADO DE LA IA
===================================================== */

export type NivelConfianza = 'alta' | 'media' | 'baja';

export interface ResultadoCompatibilidad {
  puntuacion: number;
  raza_puntos: number;
  madurez_puntos: number;
  altura_puntos: number;
  ubicacion_puntos: number;
  otros_puntos: number;
  nivel_confianza: NivelConfianza;
  resumen_cria: string;
  fortalezas: string[];
  riesgos: string[];
  recomendaciones: string[];
  datos_faltantes_importantes: string[];
  modelo: string;
}

export interface EjemplarResumen {
  id_caballo: number;
  nombre: string;
  raza: string;
  propietario: string;
}

export interface EvaluacionCompatibilidad {
  resultado: ResultadoCompatibilidad;
  caballo: EjemplarResumen;
  yegua: EjemplarResumen;
  desde_cache: boolean; // true = resultado guardado, no gastó estimación
  evaluaciones_restantes_hoy?: number; // solo al evaluar
  aviso: string;
  id_solicitud?: number; // solo en estudios guardados
  fecha?: string; // ISO en UTC, solo en estudios guardados
}

/* =====================================================
   MIS RESULTADOS (listado)
===================================================== */

export interface ResumenEstudio {
  id_solicitud: number;
  fecha: string; // ISO en UTC
  puntuacion: number;
  nivel_confianza: NivelConfianza;
  caballo: EjemplarResumen;
  yegua: EjemplarResumen;
}

@Injectable({
  providedIn: 'root',
})
export class CompatibilidadService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/api/v1/compatibilidad`;

  // GET /api/v1/compatibilidad/cupo
  obtenerCupo(): Observable<CupoCompatibilidad> {
    return this.http.get<CupoCompatibilidad>(`${this.apiUrl}/cupo`, { withCredentials: true });
  }

  // GET /api/v1/compatibilidad/mis-resultados
  listarMisResultados(): Observable<ResumenEstudio[]> {
    return this.http.get<ResumenEstudio[]>(`${this.apiUrl}/mis-resultados`, {
      withCredentials: true,
    });
  }

  // GET /api/v1/compatibilidad/resultados/:id (guardado: no gasta estimación)
  obtenerResultado(idSolicitud: number): Observable<EvaluacionCompatibilidad> {
    return this.http.get<EvaluacionCompatibilidad>(`${this.apiUrl}/resultados/${idSolicitud}`, {
      withCredentials: true,
    });
  }

  // POST /api/v1/compatibilidad
  evaluar(idCaballo: number, idYegua: number): Observable<EvaluacionCompatibilidad> {
    return this.http.post<EvaluacionCompatibilidad>(
      this.apiUrl,
      { id_caballo: idCaballo, id_yegua: idYegua },
      { withCredentials: true },
    );
  }
}
