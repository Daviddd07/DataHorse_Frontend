import { Injectable } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

/* =====================================================
   RAZA
===================================================== */

export interface Raza {
  id_raza: number;

  nombre: string;

  descripcion?: string | null;
}

/* =====================================================
   NUEVA PUBLICACIÓN
===================================================== */

export interface NuevaPublicacion {
  id_raza?: number;

  raza_personalizada?: string;

  nombre: string;

  sexo: 'Macho' | 'Hembra';

  fecha_nacimiento: string;

  altura: number;

  color: string;

  ubicacion: string;

  descripcion: string;

  disponibilidad: string;

  precio?: number | null;
}

/* =====================================================
   RESPUESTA AL CREAR PUBLICACIÓN
===================================================== */

export interface CrearPublicacionResponse {
  mensaje: string;

  id_publicacion: number;

  id_caballo: number;

  id_raza: number;

  id_usuario: number;

  nombre: string;

  sexo: string;

  precio: number | null;
}

/* =====================================================
   PUBLICACIÓN DEL MARKETPLACE
===================================================== */

export interface Publicacion {
  id_publicacion: number;

  id_caballo: number;

  id_usuario: number;

  titulo: string;

  nombre: string;

  raza: string;

  sexo: 'Macho' | 'Hembra';

  ubicacion: string;

  color: string;

  descripcion: string;

  disponibilidad: string;

  fecha_publicacion: string;

  precio: number | null;

  propietario: string;

  es_mia: boolean;

  es_favorita: boolean;

  // 👇 NUEVO: la foto principal (viene del backend con el LEFT JOIN)
  foto_principal?: string | null;
}

/* =====================================================
   FOTO DE CABALLO (respuesta al subir)
===================================================== */

export interface FotoCaballo {
  id_foto: number;

  ruta: string;

  es_principal: boolean;

  orden: number;

  fecha_subida?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CaballoService {
  private readonly apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  // =====================================================
  // LISTAR RAZAS
  //
  // GET /api/v1/razas
  // =====================================================

  listarRazas(): Observable<Raza[]> {
    return this.http.get<Raza[]>(
      `${this.apiUrl}/api/v1/razas`,

      {
        withCredentials: true,
      },
    );
  }

  // =====================================================
  // CREAR CABALLO + PUBLICACIÓN
  //
  // POST /api/v1/caballos
  // =====================================================

  crear(datos: NuevaPublicacion): Observable<CrearPublicacionResponse> {
    return this.http.post<CrearPublicacionResponse>(
      `${this.apiUrl}/api/v1/caballos`,

      datos,

      {
        withCredentials: true,
      },
    );
  }

  // =====================================================
  // LISTAR PUBLICACIONES
  //
  // GET /publicaciones
  // =====================================================

  listarPublicaciones(): Observable<Publicacion[]> {
    return this.http.get<Publicacion[]>(
      `${this.apiUrl}/publicaciones`,

      {
        withCredentials: true,
      },
    );
  }

  // =====================================================
  // AGREGAR FAVORITO
  //
  // POST /api/v1/caballos/{id}/favorito
  // =====================================================

  agregarFavorito(idCaballo: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/api/v1/caballos/${idCaballo}/favorito`,

      {},

      {
        withCredentials: true,
      },
    );
  }

  // =====================================================
  // QUITAR FAVORITO
  //
  // DELETE /api/v1/caballos/{id}/favorito
  // =====================================================

  quitarFavorito(idCaballo: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/api/v1/caballos/${idCaballo}/favorito`,

      {
        withCredentials: true,
      },
    );
  }

  // =====================================================
  // SUBIR FOTOS
  //
  // POST /api/v1/caballos/{id}/fotos
  // =====================================================

  subirFotos(idCaballo: number, archivos: File[]): Observable<FotoCaballo[]> {
    const formData = new FormData();

    archivos.forEach((archivo) => {
      formData.append('files', archivo);
    });

    return this.http.post<FotoCaballo[]>(
      `${this.apiUrl}/api/v1/caballos/${idCaballo}/fotos`,

      formData,

      {
        withCredentials: true,
      },
    );
  }
}
