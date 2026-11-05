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

export interface ResumenConversacion {
  id_conversacion: number;
  id_publicacion: number;
  titulo_publicacion: string;
  soy_vendedor: boolean;
  otro_usuario: { id: number; nombre: string };
  ultimo_mensaje: string | null;
  fecha_ultimo_mensaje: string | null;
  ultimo_mensaje_es_mio: boolean;
  no_leidos: number; // mensajes del otro participante que aún no he leído
  fecha_creacion: string;
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

  // GET /api/v1/conversaciones/:id/mensajes
  obtener(idConversacion: number): Observable<ConversacionConMensajes> {
    return this.http.get<ConversacionConMensajes>(`${this.apiUrl}/${idConversacion}/mensajes`, {
      withCredentials: true,
    });
  }
}
