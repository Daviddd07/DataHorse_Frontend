import { Injectable } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

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
  ubicacion_texto?: string;
  ciudad?: string;
  departamento?: string;
  ubicacion_lat?: number | null;
  ubicacion_lng?: number | null;

  color: string;

  descripcion: string;

  disponibilidad: string;

  fecha_publicacion: string;

  fecha_nacimiento: string;

  altura: number;

  precio: number | null;

  propietario: string;

  es_mia: boolean;

  es_favorita: boolean;

  foto_principal?: string | null;
}

export interface FotoDetalle {
  id_foto: number;
  ruta: string;
  es_principal: boolean;
  orden: number;
}

export interface PublicacionDetalle {
  id_publicacion: number;
  id_caballo: number;
  id_usuario: number;

  titulo: string;
  descripcion: string;
  fecha_publicacion: string;
  estado: string;

  nombre: string;
  sexo: 'Macho' | 'Hembra';
  fecha_nacimiento: string;
  altura: number;
  color: string;
  ubicacion: string;
  disponibilidad: string;

  id_raza: number;
  raza: string;
  raza_descripcion: string | null;

  propietario: string;
  propietario_ubicacion: string | null;
  propietario_telefono: string | null;

  precio: number | null;

  es_mia: boolean;
  es_favorita: boolean;

  fotos: FotoDetalle[];
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
  private readonly apiUrl = environment.apiUrl;

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

  obtenerCaballo(idCaballo: number): Observable<CaballoDetalle> {
    return this.http.get<CaballoDetalle>(`${this.apiUrl}/api/v1/caballos/${idCaballo}`, {
      withCredentials: true,
    });
  }

  actualizarCaballo(
    idCaballo: number,
    datos: CaballoUpdatePayload,
  ): Observable<{ mensaje: string; id_caballo: number }> {
    return this.http.put<{ mensaje: string; id_caballo: number }>(
      `${this.apiUrl}/api/v1/caballos/${idCaballo}`,
      datos,
      { withCredentials: true },
    );
  }

  eliminarCaballo(idCaballo: number): Observable<{ mensaje: string; id_caballo: number }> {
    return this.http.delete<{ mensaje: string; id_caballo: number }>(
      `${this.apiUrl}/api/v1/caballos/${idCaballo}`,
      { withCredentials: true },
    );
  }

  eliminarFoto(
    idCaballo: number,
    idFoto: number,
  ): Observable<{ mensaje: string; id_foto: number }> {
    return this.http.delete<{ mensaje: string; id_foto: number }>(
      `${this.apiUrl}/api/v1/caballos/${idCaballo}/fotos/${idFoto}`,
      { withCredentials: true },
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

  obtenerPublicacion(idPublicacion: number): Observable<PublicacionDetalle> {
    return this.http.get<PublicacionDetalle>(`${this.apiUrl}/publicaciones/${idPublicacion}`, {
      withCredentials: true,
    });
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
  listarMisCaballos(): Observable<CaballoMio[]> {
    return this.http.get<CaballoMio[]>(`${this.apiUrl}/api/v1/caballos/mios`, {
      withCredentials: true,
    });
  }
}

export interface CaballoMio {
  id_caballo: number;
  nombre: string;
  sexo: 'Macho' | 'Hembra';
  fecha_nacimiento: string;
  altura: number;
  color: string;
  ubicacion: string;
  descripcion: string;
  disponibilidad: string;

  id_raza: number;
  raza: string;

  foto_principal: string | null;

  id_publicacion: number | null;
  precio: number | null;
  publicado: boolean;
}
export interface FotoCaballoDetalle {
  id_foto: number;
  ruta: string;
  es_principal: boolean;
  orden: number;
}

export interface CaballoDetalle {
  id_caballo: number;
  nombre: string;
  sexo: 'Macho' | 'Hembra';
  fecha_nacimiento: string;
  altura: number;
  color: string;
  ubicacion: string;
  descripcion: string;
  disponibilidad: string;

  id_raza: number;
  raza: string;

  id_publicacion: number | null;
  precio: number | null;

  fotos: FotoCaballoDetalle[];
}

export interface CaballoUpdatePayload {
  id_raza?: number;
  raza_personalizada?: string;
  nombre: string;
  fecha_nacimiento: string;
  altura: number;
  color: string;
  ubicacion: string;
  descripcion: string;
  disponibilidad: 'Disponible' | 'No disponible';
  precio?: number | null;
}
