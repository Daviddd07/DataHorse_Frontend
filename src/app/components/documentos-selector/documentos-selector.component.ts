import { Component, computed, input, model, signal } from '@angular/core';

import {
  DOCUMENTO_ACCEPT,
  DOCUMENTOS_MAX_POR_CABALLO,
  DocumentoPendiente,
  TIPOS_DOCUMENTO,
  TITULO_MAX,
  TipoDocumento,
  errorDeArchivo,
  errorDeTitulo,
  tamanoLegible,
  tituloSugerido,
} from '../../Services/documento.service';

/** Primer error de la lista de pendientes, o null si se pueden subir. */
export function errorDePendientes(pendientes: DocumentoPendiente[]): string | null {
  for (const p of pendientes) {
    const error = errorDeTitulo(p.titulo);
    if (error) {
      return `"${p.archivo.name}": ${error}`;
    }
  }
  return null;
}

/**
 * Elige documentos de respaldo (opcional) con su tipo y título, sin subirlos.
 * Uso: <app-documentos-selector [(pendientes)]="miSenal" [yaSubidos]="3" />
 */
@Component({
  selector: 'app-documentos-selector',
  standalone: true,
  template: `
    <div class="ds-campo">
      <div class="ds-cabecera">
        <span class="ds-titulo">
          Documentos de respaldo <span class="ds-opcional">(opcional)</span>
        </span>
        <span class="ds-ayuda">
          Pedigrí, registro, premios o pruebas genéticas que respalden la genética y el fenotipo
          descritos. PDF o imagen, hasta 10 MB cada uno. Los demás usuarios podrán verlos, pero no
          descargarlos.
        </span>
      </div>

      <input
        #entrada
        type="file"
        [accept]="accept"
        multiple
        hidden
        aria-label="Seleccionar documentos de respaldo"
        (change)="alElegir($event)"
      />

      @if (cupo() > 0) {
        <button type="button" class="ds-boton" (click)="entrada.click()">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
            <path
              d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z M14 3v5h5 M12 11v6 M9 14h6"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Añadir documentos
        </button>
      } @else {
        <span class="ds-ayuda">Llegaste al máximo de {{ maximo }} documentos.</span>
      }

      @if (aviso()) {
        <p class="ds-aviso" role="alert">{{ aviso() }}</p>
      }

      @if (pendientes().length > 0) {
        <ul class="ds-lista">
          @for (p of pendientes(); track p.archivo; let i = $index) {
            <li class="ds-item">
              <div class="ds-archivo">
                <span class="ds-nombre" [title]="p.archivo.name">{{ p.archivo.name }}</span>
                <span class="ds-tamano">{{ tamano(p.archivo.size) }}</span>
                <button
                  type="button"
                  class="ds-quitar"
                  [attr.aria-label]="'Quitar ' + p.archivo.name"
                  (click)="quitar(i)"
                >
                  ×
                </button>
              </div>
              <div class="ds-datos">
                <select
                  class="ds-select"
                  [value]="p.tipo"
                  [attr.aria-label]="'Tipo de ' + p.archivo.name"
                  (change)="cambiarTipo(i, $any($event.target).value)"
                >
                  @for (t of tipos; track t.valor) {
                    <option [value]="t.valor">{{ t.etiqueta }}</option>
                  }
                </select>
                <input
                  class="ds-input"
                  type="text"
                  [value]="p.titulo"
                  [attr.maxlength]="tituloMax"
                  placeholder="Ej: Registro ASDE, Campeón nacional 2024"
                  [attr.aria-label]="'Título de ' + p.archivo.name"
                  [class.ds-input-error]="errorTitulo(p)"
                  (input)="cambiarTitulo(i, $any($event.target).value)"
                />
              </div>
              @if (errorTitulo(p); as error) {
                <span class="ds-error">{{ error }}</span>
              }
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    .ds-campo {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 20px;
      border: 1px dashed rgba(255, 255, 255, 0.2);
      border-radius: 16px;
      background: rgba(0, 0, 0, 0.2);
    }
    .ds-cabecera {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .ds-titulo {
      font-weight: 700;
      font-size: 0.95rem;
      color: var(--text-main);
    }
    .ds-opcional {
      font-weight: 500;
      color: var(--text-muted);
    }
    .ds-ayuda {
      font-size: 0.78rem;
      color: var(--text-muted);
      line-height: 1.45;
    }
    .ds-boton {
      align-self: flex-start;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border: 1px dashed var(--accent-gold);
      border-radius: 10px;
      background: rgba(230, 168, 23, 0.1);
      color: var(--accent-gold);
      font-family: inherit;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition:
        background 0.2s ease,
        transform 0.2s ease;
    }
    .ds-boton:hover {
      background: rgba(230, 168, 23, 0.2);
      transform: translateY(-1px);
    }
    .ds-boton:focus-visible,
    .ds-quitar:focus-visible {
      outline: 2px solid var(--accent-gold);
      outline-offset: 2px;
    }
    .ds-aviso,
    .ds-error {
      margin: 0;
      font-size: 0.78rem;
      color: #ff8a8a;
    }
    .ds-lista {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .ds-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px 14px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
    }
    .ds-archivo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.85rem;
      color: var(--text-main);
    }
    .ds-nombre {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ds-tamano {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .ds-quitar {
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: #ff6b6b;
      font-size: 1.2rem;
      font-weight: 700;
      line-height: 1;
      cursor: pointer;
    }
    .ds-quitar:hover {
      background: rgba(255, 107, 107, 0.2);
    }
    .ds-datos {
      display: grid;
      grid-template-columns: minmax(150px, 190px) 1fr;
      gap: 8px;
    }
    .ds-select,
    .ds-input {
      min-width: 0;
      padding: 9px 12px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      background: rgba(0, 0, 0, 0.25);
      color: var(--text-main);
      font-family: inherit;
      font-size: 0.85rem;
    }
    .ds-select option {
      color: #111;
    }
    .ds-input-error {
      border-color: #ff8a8a;
    }
    @media (max-width: 560px) {
      .ds-datos {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class DocumentosSelectorComponent {
  /** Documentos elegidos, sin subir todavía. */
  readonly pendientes = model<DocumentoPendiente[]>([]);

  /** Cuántos tiene ya el caballo, para respetar el máximo. */
  readonly yaSubidos = input(0);

  readonly tipos = TIPOS_DOCUMENTO;
  readonly accept = DOCUMENTO_ACCEPT;
  readonly maximo = DOCUMENTOS_MAX_POR_CABALLO;
  readonly tituloMax = TITULO_MAX;

  readonly aviso = signal('');

  readonly cupo = computed(() => this.maximo - this.yaSubidos() - this.pendientes().length);

  // Muestra el error del título solo cuando el usuario ya escribió algo
  private readonly tocados = signal(new Set<File>());

  alElegir(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const archivos = Array.from(entrada.files ?? []);
    entrada.value = ''; // permite volver a elegir el mismo archivo

    const rechazados: string[] = [];
    const nuevos: DocumentoPendiente[] = [];

    for (const archivo of archivos) {
      const error = errorDeArchivo(archivo);
      if (error) {
        rechazados.push(`${archivo.name}: ${error}`);
      } else if (nuevos.length < this.cupo()) {
        nuevos.push({ archivo, tipo: 'pedigri', titulo: tituloSugerido(archivo.name) });
      } else {
        rechazados.push(`${archivo.name}: máximo ${this.maximo} documentos por caballo.`);
      }
    }

    this.aviso.set(rechazados.join(' · '));
    if (nuevos.length) {
      this.pendientes.update((lista) => [...lista, ...nuevos]);
    }
  }

  quitar(indice: number): void {
    this.pendientes.update((lista) => lista.filter((_, i) => i !== indice));
    this.aviso.set('');
  }

  cambiarTipo(indice: number, tipo: TipoDocumento): void {
    this.actualizar(indice, { tipo });
  }

  cambiarTitulo(indice: number, titulo: string): void {
    const archivo = this.pendientes()[indice]?.archivo;
    if (archivo) {
      this.tocados.update((s) => new Set(s).add(archivo));
    }
    this.actualizar(indice, { titulo });
  }

  errorTitulo(p: DocumentoPendiente): string | null {
    return this.tocados().has(p.archivo) || !p.titulo ? errorDeTitulo(p.titulo) : null;
  }

  tamano(bytes: number): string {
    return tamanoLegible(bytes);
  }

  private actualizar(indice: number, cambios: Partial<DocumentoPendiente>): void {
    this.pendientes.update((lista) => lista.map((p, i) => (i === indice ? { ...p, ...cambios } : p)));
  }
}
