import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { DocumentoCaballo, DocumentoService } from '../../Services/documento.service';

// Por si un documento trae cientos de páginas: el visor no debe colgar el navegador
const MAX_PAGINAS = 40;

/**
 * Muestra un documento de respaldo dentro de la página, sin ofrecer descarga.
 * Los PDF se dibujan página por página en <canvas> con pdf.js, así el navegador
 * no abre su visor propio (que trae botón de descargar). Las imágenes van en un <img>
 * sin menú contextual ni arrastre. No impide una captura de pantalla.
 */
@Component({
  selector: 'app-visor-documento',
  standalone: true,
  host: { '(document:keydown.escape)': 'cerrar.emit()' },
  template: `
    <div class="vd-fondo" (click)="cerrar.emit()"></div>
    <div
      class="vd-dialogo"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="'Documento: ' + documento().titulo"
    >
      <header class="vd-cabecera">
        <div class="vd-info">
          <span class="vd-tipo">{{ documento().tipo_etiqueta }}</span>
          <h2 class="vd-titulo">{{ documento().titulo }}</h2>
        </div>
        <button #botonCerrar type="button" class="vd-cerrar" aria-label="Cerrar" (click)="cerrar.emit()">
          ×
        </button>
      </header>

      <div class="vd-cuerpo" (contextmenu)="$event.preventDefault()" (dragstart)="$event.preventDefault()">
        @if (cargando()) {
          <p class="vd-estado">Cargando documento…</p>
        }
        @if (error()) {
          <p class="vd-estado vd-error" role="alert">{{ error() }}</p>
        }
        @if (imagenUrl(); as url) {
          <img class="vd-imagen" [src]="url" [alt]="documento().titulo" draggable="false" />
        }
        <div #paginas class="vd-paginas"></div>
        @if (recortado()) {
          <p class="vd-estado">Se muestran las primeras {{ maxPaginas }} páginas.</p>
        }
      </div>

      <footer class="vd-pie">Solo visualización · Documento aportado por el propietario</footer>
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .vd-fondo {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
    }
    .vd-dialogo {
      position: relative;
      display: flex;
      flex-direction: column;
      width: min(920px, 100%);
      max-height: 100%;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      background: #15120f;
      overflow: hidden;
    }
    .vd-cabecera {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .vd-info {
      flex: 1;
      min-width: 0;
    }
    .vd-tipo {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--accent-gold);
    }
    .vd-titulo {
      margin: 2px 0 0;
      font-size: 1rem;
      color: var(--text-main);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .vd-cerrar {
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-main);
      font-size: 1.4rem;
      line-height: 1;
      cursor: pointer;
    }
    .vd-cerrar:hover {
      background: rgba(255, 255, 255, 0.16);
    }
    .vd-cerrar:focus-visible {
      outline: 2px solid var(--accent-gold);
      outline-offset: 2px;
    }
    .vd-cuerpo {
      flex: 1;
      overflow: auto;
      padding: 16px;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    }
    .vd-imagen,
    .vd-paginas ::ng-deep canvas {
      display: block;
      max-width: 100%;
      height: auto;
      margin: 0 auto 12px;
      border-radius: 6px;
      background: #fff;
      pointer-events: none;
    }
    .vd-estado {
      margin: 24px 0;
      text-align: center;
      font-size: 0.9rem;
      color: var(--text-muted);
    }
    .vd-error {
      color: #ff8a8a;
    }
    .vd-pie {
      padding: 10px 18px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 0.75rem;
      color: var(--text-muted);
      text-align: center;
    }
  `,
})
export class VisorDocumentoComponent implements OnInit, OnDestroy {
  private readonly documentos = inject(DocumentoService);

  readonly idCaballo = input.required<number>();
  readonly documento = input.required<DocumentoCaballo>();
  readonly cerrar = output<void>();

  readonly maxPaginas = MAX_PAGINAS;
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly imagenUrl = signal<string | null>(null);
  readonly recortado = signal(false);

  private readonly paginas = viewChild.required<ElementRef<HTMLDivElement>>('paginas');
  private readonly botonCerrar = viewChild<ElementRef<HTMLButtonElement>>('botonCerrar');

  private destruido = false;
  private liberarPdf: (() => void) | null = null;

  ngOnInit(): void {
    queueMicrotask(() => this.botonCerrar()?.nativeElement.focus());
    void this.cargar();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    const url = this.imagenUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.liberarPdf?.();
  }

  private async cargar(): Promise<void> {
    try {
      const blob = await firstValueFrom(
        this.documentos.contenido(this.idCaballo(), this.documento().id_documento),
      );
      if (this.destruido) {
        return;
      }

      if (this.documento().es_pdf) {
        await this.dibujarPdf(await blob.arrayBuffer());
      } else {
        this.imagenUrl.set(URL.createObjectURL(blob));
      }
    } catch {
      if (!this.destruido) {
        this.error.set('No se pudo abrir el documento. Intenta de nuevo.');
      }
    } finally {
      this.cargando.set(false);
    }
  }

  private async dibujarPdf(datos: ArrayBuffer): Promise<void> {
    // Se carga solo cuando alguien abre un PDF, para no agrandar el resto de la app
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs/pdf.worker.min.mjs', document.baseURI).href;

    const tarea = pdfjs.getDocument({ data: new Uint8Array(datos) });
    this.liberarPdf = () => void tarea.destroy();
    const pdf = await tarea.promise;

    const contenedor = this.paginas().nativeElement;
    const ancho = Math.max(320, contenedor.clientWidth || 800);
    const densidad = Math.min(window.devicePixelRatio || 1, 2);
    const total = Math.min(pdf.numPages, MAX_PAGINAS);
    this.recortado.set(pdf.numPages > MAX_PAGINAS);

    for (let numero = 1; numero <= total; numero++) {
      if (this.destruido) {
        return;
      }
      const pagina = await pdf.getPage(numero);
      const base = pagina.getViewport({ scale: 1 });
      const viewport = pagina.getViewport({ scale: (ancho / base.width) * densidad });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / densidad)}px`;
      canvas.setAttribute('aria-label', `Página ${numero} de ${pdf.numPages}`);
      canvas.setAttribute('role', 'img');
      contenedor.appendChild(canvas);

      await pagina.render({ canvas, viewport }).promise;
      if (numero === 1) {
        this.cargando.set(false);
      }
    }
  }
}
