import { Injectable, inject } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

/* =====================================================
   MODELOS DEL CHAT
===================================================== */

export interface MensajeChat {
  id_mensaje: number;
  id_conversacion: number;
  id_usuario: number;
  contenido: string;
  fecha_envio: string; // hora local de Colombia, sin zona (YYYY-MM-DDTHH:mm:ss)
  estado_lectura: string;
}

/** Promedio de estrellas (1 a 5) y número de reseñas; promedio null si aún no tiene. */
export interface Calificacion {
  promedio: number | null;
  total: number;
}

/** Si tiene la app abierta y cuándo se conectó por última vez (hora local, sin zona). */
export interface EstadoConexion {
  en_linea: boolean;
  ultima_conexion: string | null;
}

export interface OtroParticipante {
  id: number;
  nombre: string;
  // foto_perfil: ruta pública ('/uploads/perfiles/...') o null para mostrar la inicial
  foto_perfil?: string | null;
  calificacion?: Calificacion;
  conexion?: EstadoConexion | null;
}

export interface ResumenConversacion {
  id_conversacion: number;
  id_publicacion: number;
  titulo_publicacion: string;
  soy_vendedor: boolean;
  otro_usuario: OtroParticipante;
  ultimo_mensaje: string | null;
  fecha_ultimo_mensaje: string | null;
  ultimo_mensaje_es_mio: boolean;
  no_leidos: number; // mensajes del otro participante que aún no he leído
  fecha_creacion: string;
  estado?: string;
  finalizada?: boolean; // en solo lectura; se puede calificar al otro
  ya_califique?: boolean; // solo en el detalle de una conversación
}

export interface Resena {
  id_resena: number;
  id_conversacion: number;
  id_evaluador: number;
  id_evaluado: number;
  calificacion: number;
  comentario: string | null;
  fecha: string;
}

export interface RespuestaResena {
  resena: Resena;
  calificacion_evaluado: Calificacion;
}

export interface ConversacionConMensajes {
  conversacion: ResumenConversacion;
  mensajes: MensajeChat[];
}

/* =====================================================
   PARTE REST (abrir, listar, historial)
   El tiempo real va en ChatWebSocketService.
===================================================== */

@Injectable({
  providedIn: 'root',
})
export class ConversacionService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/api/v1/conversaciones`;

  // POST /api/v1/conversaciones (crea o reutiliza la conversación con el vendedor)
  abrir(idPublicacion: number): Observable<{ id_conversacion: number }> {
    return this.http.post<{ id_conversacion: number }>(
      this.apiUrl,
      { id_publicacion: idPublicacion },
      { withCredentials: true },
    );
  }

  // GET /api/v1/conversaciones
  listar(): Observable<ResumenConversacion[]> {
    return this.http.get<ResumenConversacion[]>(this.apiUrl, { withCredentials: true });
  }

  // GET /api/v1/conversaciones/no-leidos
  contarNoLeidos(): Observable<{ total: number }> {
    return this.http.get<{ total: number }>(`${this.apiUrl}/no-leidos`, { withCredentials: true });
  }

  // POST /api/v1/conversaciones/:id/leer
  marcarLeidos(idConversacion: number): Observable<{ marcados: number }> {
    return this.http.post<{ marcados: number }>(
      `${this.apiUrl}/${idConversacion}/leer`,
      {},
      { withCredentials: true },
    );
  }

  // POST /api/v1/conversaciones/:id/finalizar (queda en solo lectura y se puede calificar)
  finalizar(idConversacion: number): Observable<{ id_conversacion: number; estado: string }> {
    return this.http.post<{ id_conversacion: number; estado: string }>(
      `${this.apiUrl}/${idConversacion}/finalizar`,
      {},
      { withCredentials: true },
    );
  }

  // POST /api/v1/conversaciones/:id/resena (1 a 5 estrellas al otro participante)
  calificar(
    idConversacion: number,
    calificacion: number,
    comentario: string | null,
  ): Observable<RespuestaResena> {
    return this.http.post<RespuestaResena>(
      `${this.apiUrl}/${idConversacion}/resena`,
      { calificacion, comentario },
      { withCredentials: true },
    );
  }

  // GET /api/v1/usuarios/:id/calificacion
  calificacionDe(idUsuario: number): Observable<Calificacion> {
    return this.http.get<Calificacion>(
      `${environment.apiUrl}/api/v1/usuarios/${idUsuario}/calificacion`,
      {
        withCredentials: true,
      },
    );
  }

  // GET /api/v1/conversaciones/:id/mensajes
  obtener(idConversacion: number): Observable<ConversacionConMensajes> {
    return this.http.get<ConversacionConMensajes>(`${this.apiUrl}/${idConversacion}/mensajes`, {
      withCredentials: true,
    });
  }
}
