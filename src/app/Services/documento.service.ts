import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

// ======================================================
// DOCUMENTOS DE RESPALDO DE UN CABALLO MACHO
// (pedigrí, premios, pruebas genéticas...). La carga es opcional.
// Las reglas son las mismas que valida el backend.
// ======================================================

export type TipoDocumento = 'pedigri' | 'premio' | 'prueba_genetica' | 'otro';

export const TIPOS_DOCUMENTO: { valor: TipoDocumento; etiqueta: string }[] = [
  { valor: 'pedigri', etiqueta: 'Pedigrí / registro' },
  { valor: 'premio', etiqueta: 'Premio' },
  { valor: 'prueba_genetica', etiqueta: 'Prueba genética' },
  { valor: 'otro', etiqueta: 'Otro' },
];

export const DOCUMENTO_MAX_BYTES = 10 * 1024 * 1024;
export const DOCUMENTOS_MAX_POR_CABALLO = 10;
export const DOCUMENTO_EXTENSIONES = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
export const DOCUMENTO_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp';
export const TITULO_MIN = 2;
export const TITULO_MAX = 120;

/** Documento elegido en el formulario, todavía sin subir. */
export interface DocumentoPendiente {
  archivo: File;
  tipo: TipoDocumento;
  titulo: string;
}

export interface DocumentoCaballo {
  id_documento: number;
  tipo: TipoDocumento;
  tipo_etiqueta: string;
  titulo: string;
  content_type: string;
  es_pdf: boolean;
  tamano_bytes: number;
  estado_verificacion: string;
  fecha_subida: string | null;
}

export interface DocumentosDeCaballo {
  es_propietario: boolean;
  documentos: DocumentoCaballo[];
}

/** Error de un archivo antes de subirlo, o null si está bien. */
export function errorDeArchivo(archivo: File): string | null {
  const punto = archivo.name.lastIndexOf('.');
  const extension = punto >= 0 ? archivo.name.slice(punto).toLowerCase() : '';

  if (!DOCUMENTO_EXTENSIONES.includes(extension)) {
    return 'Formato no permitido. Usa PDF, JPG, PNG o WEBP.';
  }
  if (archivo.size === 0) {
    return 'El archivo está vacío.';
  }
  if (archivo.size > DOCUMENTO_MAX_BYTES) {
    return 'Supera los 10 MB.';
  }
  return null;
}

/** Error del título, o null si está bien. */
export function errorDeTitulo(titulo: string): string | null {
  const largo = titulo.trim().length;
  if (largo < TITULO_MIN || largo > TITULO_MAX) {
    return `El título debe tener entre ${TITULO_MIN} y ${TITULO_MAX} caracteres.`;
  }
  return null;
}

/** Título sugerido a partir del nombre del archivo (sin extensión). */
export function tituloSugerido(nombreArchivo: string): string {
  const sinExtension = nombreArchivo.replace(/\.[^.]+$/, '');
  return sinExtension.replace(/[_-]+/g, ' ').trim().slice(0, TITULO_MAX);
}

export function tamanoLegible(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

@Injectable({ providedIn: 'root' })
export class DocumentoService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = environment.apiUrl;

  private url(idCaballo: number): string {
    return `${this.apiUrl}/api/v1/caballos/${idCaballo}/documentos`;
  }

  listar(idCaballo: number): Observable<DocumentosDeCaballo> {
    return this.http.get<DocumentosDeCaballo>(this.url(idCaballo), { withCredentials: true });
  }

  subir(idCaballo: number, pendientes: DocumentoPendiente[]): Observable<DocumentoCaballo[]> {
    // Cada archivo va con su tipo y su título, en el mismo orden
    const formData = new FormData();
    for (const p of pendientes) {
      formData.append('files', p.archivo);
      formData.append('tipos', p.tipo);
      formData.append('titulos', p.titulo.trim());
    }
    return this.http.post<DocumentoCaballo[]>(this.url(idCaballo), formData, {
      withCredentials: true,
    });
  }

  /** Contenido para el visor (no es una descarga). */
  contenido(idCaballo: number, idDocumento: number): Observable<Blob> {
    return this.http.get(`${this.url(idCaballo)}/${idDocumento}/contenido`, {
      withCredentials: true,
      responseType: 'blob',
    });
  }

  /** Archivo original; el backend solo lo entrega al propietario. */
  descargar(idCaballo: number, idDocumento: number): Observable<Blob> {
    return this.http.get(`${this.url(idCaballo)}/${idDocumento}/descarga`, {
      withCredentials: true,
      responseType: 'blob',
    });
  }

  eliminar(idCaballo: number, idDocumento: number): Observable<unknown> {
    return this.http.delete(`${this.url(idCaballo)}/${idDocumento}`, { withCredentials: true });
  }
}
