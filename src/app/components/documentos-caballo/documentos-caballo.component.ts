import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

import {
  DocumentoCaballo,
  DocumentoPendiente,
  DocumentoService,
  tamanoLegible,
} from '../../Services/documento.service';
import {
  DocumentosSelectorComponent,
  errorDePendientes,
} from '../documentos-selector/documentos-selector.component';
import { VisorDocumentoComponent } from '../visor-documento/visor-documento.component';
import { SelloRespaldoComponent } from '../sello-respaldo/sello-respaldo.component';

const EXTENSION: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/**
 * Documentos de respaldo de un caballo macho.
 * - Cualquier usuario con sesión: lista y visor (sin descarga).
 * - Propietario con [gestionar]="true": además sube, descarga y elimina.
 */
@Component({
  selector: 'app-documentos-caballo',
  standalone: true,
  imports: [DatePipe, DocumentosSelectorComponent, VisorDocumentoComponent, SelloRespaldoComponent],
  template: `
    <section class="dc" [attr.aria-label]="'Documentos de respaldo'">
      <header class="dc-cabecera">
        <h3 class="dc-titulo">
          <app-sello-respaldo [tamano]="20" />
          Documentos de respaldo
        </h3>
        @if (!puedeGestionar()) {
          <span class="dc-nota" title="DataHorse no ha verificado estos documentos">
            Aportados por el propietario
          </span>
        }
      </header>

      @if (cargando()) {
        <p class="dc-estado">Cargando documentos…</p>
      } @else if (errorCarga()) {
        <p class="dc-estado dc-error">{{ errorCarga() }}</p>
      } @else if (documentos().length === 0) {
        <p class="dc-estado">
          {{ puedeGestionar() ? 'Este caballo todavía no tiene documentos.' : 'Sin documentos.' }}
        </p>
      } @else {
        <ul class="dc-lista">
          @for (d of documentos(); track d.id_documento) {
            <li class="dc-item">
              <span class="dc-icono" aria-hidden="true">
                @if (d.es_pdf) {
                  <!-- Hoja con esquina doblada y la etiqueta PDF -->
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M14 2.5H7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7.5l-5-5Z M14 2.5v5h5"
                      stroke="currentColor"
                      stroke-width="1.6"
                      stroke-linejoin="round"
                    />
                    <rect x="3" y="12" width="13" height="6.5" rx="1.5" fill="currentColor" />
                    <text x="9.5" y="16.9" text-anchor="middle" class="dc-icono-pdf">PDF</text>
                  </svg>
                } @else {
                  <!-- Marco de foto con montaña y sol -->
                  <svg viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" stroke-width="1.6" />
                    <circle cx="9" cy="9.5" r="1.8" fill="currentColor" />
                    <path
                      d="M3.8 18.2 9.5 13l3.5 3 2.5-2.2 4.7 4.2"
                      stroke="currentColor"
                      stroke-width="1.6"
                      stroke-linejoin="round"
                    />
                  </svg>
                }
              </span>
              <div class="dc-datos">
                <span class="dc-nombre">{{ d.titulo }}</span>
                <span class="dc-meta">
                  {{ d.tipo_etiqueta }} · {{ tamano(d.tamano_bytes) }}
                  @if (d.fecha_subida) {
                    · {{ d.fecha_subida | date: 'd MMM y' }}
                  }
                </span>
              </div>
              <div class="dc-acciones">
                <button type="button" class="dc-btn" (click)="abierto.set(d)">Ver</button>
                @if (puedeGestionar()) {
                  <button
                    type="button"
                    class="dc-btn"
                    [disabled]="ocupado()"
                    (click)="descargar(d)"
                  >
                    Descargar
                  </button>
                  <button
                    type="button"
                    class="dc-btn dc-btn-peligro"
                    [disabled]="ocupado()"
                    [attr.aria-label]="'Eliminar ' + d.titulo"
                    (click)="eliminar(d)"
                  >
                    Eliminar
                  </button>
                }
              </div>
            </li>
          }
        </ul>
      }

      @if (puedeGestionar()) {
        <app-documentos-selector [(pendientes)]="pendientes" [yaSubidos]="documentos().length" />
        @if (pendientes().length > 0) {
          <button type="button" class="dc-subir" [disabled]="ocupado()" (click)="subir()">
            {{ ocupado() ? 'Subiendo…' : 'Subir ' + pendientes().length + ' documento(s)' }}
          </button>
        }
      }

      @if (mensaje()) {
        <p class="dc-mensaje" [class.dc-error]="mensajeEsError()" role="status">{{ mensaje() }}</p>
      }
    </section>

    @if (abierto(); as doc) {
      <app-visor-documento [idCaballo]="idCaballo()" [documento]="doc" (cerrar)="abierto.set(null)" />
    }
  `,
  styles: `
    .dc {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .dc-cabecera {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 10px;
    }
    .dc-titulo {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 1rem;
      color: var(--text-main);
    }
    .dc-nota,
    .dc-estado,
    .dc-meta {
      font-size: 0.78rem;
      color: var(--text-muted);
    }
    .dc-estado {
      margin: 0;
    }
    .dc-error {
      color: #ff8a8a;
    }
    .dc-lista {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .dc-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.05);
    }
    .dc-icono {
      display: inline-flex;
      flex-shrink: 0;
      width: 30px;
      height: 30px;
      color: var(--accent-gold);
    }
    .dc-icono svg {
      width: 100%;
      height: 100%;
    }
    .dc-icono-pdf {
      fill: #1a1307;
      font-family: inherit;
      font-size: 5px;
      font-weight: 800;
      letter-spacing: 0.2px;
    }
    .dc-datos {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .dc-nombre {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-main);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .dc-acciones {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .dc-btn,
    .dc-subir {
      padding: 7px 12px;
      border: 1px solid rgba(230, 168, 23, 0.5);
      border-radius: 8px;
      background: rgba(230, 168, 23, 0.1);
      color: var(--accent-gold);
      font-family: inherit;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }
    .dc-btn:hover:not(:disabled),
    .dc-subir:hover:not(:disabled) {
      background: rgba(230, 168, 23, 0.2);
    }
    .dc-btn:focus-visible,
    .dc-subir:focus-visible {
      outline: 2px solid var(--accent-gold);
      outline-offset: 2px;
    }
    .dc-btn:disabled,
    .dc-subir:disabled {
      opacity: 0.6;
      cursor: default;
    }
    .dc-btn-peligro {
      border-color: rgba(255, 107, 107, 0.5);
      background: rgba(255, 107, 107, 0.1);
      color: #ff8a8a;
    }
    .dc-btn-peligro:hover:not(:disabled) {
      background: rgba(255, 107, 107, 0.2);
    }
    .dc-subir {
      align-self: flex-start;
      padding: 10px 18px;
      font-size: 0.85rem;
    }
    .dc-mensaje {
      margin: 0;
      font-size: 0.82rem;
      color: #7ddc9a;
    }
    @media (max-width: 560px) {
      .dc-item {
        flex-wrap: wrap;
      }
      .dc-acciones {
        width: 100%;
      }
    }
  `,
})
export class DocumentosCaballoComponent implements OnInit {
  private readonly servicio = inject(DocumentoService);

  readonly idCaballo = input.required<number>();
  /** true en las pantallas del propietario (Editar caballo). */
  readonly gestionar = input(false);

  readonly documentos = signal<DocumentoCaballo[]>([]);
  readonly esPropietario = signal(false);
  readonly cargando = signal(true);
  readonly errorCarga = signal('');
  readonly ocupado = signal(false);
  readonly mensaje = signal('');
  readonly mensajeEsError = signal(false);
  readonly pendientes = signal<DocumentoPendiente[]>([]);
  readonly abierto = signal<DocumentoCaballo | null>(null);

  readonly puedeGestionar = computed(() => this.gestionar() && this.esPropietario());

  ngOnInit(): void {
    this.cargar();
  }

  tamano(bytes: number): string {
    return tamanoLegible(bytes);
  }

  subir(): void {
    const error = errorDePendientes(this.pendientes());
    if (error) {
      this.avisar(error, true);
      return;
    }

    this.ocupado.set(true);
    this.servicio.subir(this.idCaballo(), this.pendientes()).subscribe({
      next: (nuevos) => {
        this.documentos.update((lista) => [...lista, ...nuevos]);
        this.pendientes.set([]);
        this.ocupado.set(false);
        this.avisar(`Se subieron ${nuevos.length} documento(s).`);
      },
      error: (err) => {
        this.ocupado.set(false);
        this.avisar(this.detalle(err, 'No se pudieron subir los documentos.'), true);
      },
    });
  }

  eliminar(doc: DocumentoCaballo): void {
    if (!confirm(`¿Eliminar el documento "${doc.titulo}"?`)) {
      return;
    }
    this.ocupado.set(true);
    this.servicio.eliminar(this.idCaballo(), doc.id_documento).subscribe({
      next: () => {
        this.documentos.update((lista) => lista.filter((d) => d.id_documento !== doc.id_documento));
        this.ocupado.set(false);
        this.avisar('Documento eliminado.');
      },
      error: (err) => {
        this.ocupado.set(false);
        this.avisar(this.detalle(err, 'No se pudo eliminar el documento.'), true);
      },
    });
  }

  descargar(doc: DocumentoCaballo): void {
    this.ocupado.set(true);
    this.servicio.descargar(this.idCaballo(), doc.id_documento).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `${doc.titulo}${EXTENSION[doc.content_type] ?? ''}`;
        enlace.click();
        // Se libera después: algunos navegadores leen la URL tras el clic
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.ocupado.set(false);
      },
      error: () => {
        this.ocupado.set(false);
        this.avisar('No se pudo descargar el documento.', true);
      },
    });
  }

  private cargar(): void {
    this.servicio.listar(this.idCaballo()).subscribe({
      next: (respuesta) => {
        this.documentos.set(respuesta.documentos);
        this.esPropietario.set(respuesta.es_propietario);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.errorCarga.set(this.detalle(err, 'No se pudieron cargar los documentos.'));
      },
    });
  }

  private avisar(texto: string, esError = false): void {
    this.mensaje.set(texto);
    this.mensajeEsError.set(esError);
  }

  private detalle(err: unknown, porDefecto: string): string {
    const detalle = (err as { error?: { detail?: unknown } })?.error?.detail;
    return typeof detalle === 'string' ? detalle : porDefecto;
  }
}
