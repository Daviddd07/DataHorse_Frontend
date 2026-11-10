import { Component, computed, inject, signal } from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import { Router } from '@angular/router';

import {
  CaballoService,
  Descendencia,
  Raza,
  NuevaPublicacion,
} from '../../../Services/caballo.service';

import { DescendenciaFormComponent } from '../../../components/descendencia-form/descendencia-form.component';

import {
  DocumentosSelectorComponent,
  errorDePendientes,
} from '../../../components/documentos-selector/documentos-selector.component';

import { DocumentoPendiente, DocumentoService } from '../../../Services/documento.service';

import { LogService } from '../../../Services/log.service';

type Paso = 'tipo' | 'formulario';

@Component({
  selector: 'app-nueva-publicacion',
  standalone: true,

  imports: [CommonModule, FormsModule, DescendenciaFormComponent, DocumentosSelectorComponent],

  templateUrl: './nueva-publicacion.component.html',

  styleUrl: './nueva-publicacion.component.css',
})
export class NuevaPublicacionComponent {
  private readonly caballoService = inject(CaballoService);

  private readonly router = inject(Router);

  private readonly log = inject(LogService);

  private readonly documentoService = inject(DocumentoService);

  // ======================================================
  // PASOS
  // ======================================================

  paso = signal<Paso>('tipo');

  sexo = signal<'Macho' | 'Hembra' | null>(null);

  // ======================================================
  // RAZAS
  // ======================================================

  razas = signal<Raza[]>([]);

  idRazaSeleccionada = signal<number | null>(null);

  razaPersonalizada = signal('');

  razaEsOtro = computed(() => this.idRazaSeleccionada() === -1);

  // ======================================================
  // DATOS DEL EJEMPLAR
  // ======================================================

  nombre = signal('');

  fechaNacimiento = signal('');

  altura = signal<number | null>(null);

  color = signal('');

  ubicacion = signal('');

  descripcion = signal('');

  disponibilidad = signal<'Disponible' | 'No disponible'>('Disponible');

  // ======================================================
  // PRECIO
  // ======================================================

  precio = signal<number | null>(null);

  // ======================================================
  // DESCENDENCIA (opcional)
  // ======================================================

  descendencia = signal<Descendencia>({});

  // ======================================================
  // ESTADO
  // ======================================================

  enviando = signal(false);

  error = signal('');

  exito = signal('');

  fotosSeleccionadas = signal<File[]>([]);

  // Documentos de respaldo: opcionales y solo para caballos machos
  documentosPendientes = signal<DocumentoPendiente[]>([]);

  // Variable para obtener la fecha de hoy en formato YYYY-MM-DD
  hoy = new Date().toISOString().split('T')[0];

  // ======================================================
  // CONSTRUCTOR
  // ======================================================

  constructor() {
    this.caballoService.listarRazas().subscribe({
      next: (razas) => {
        this.razas.set(razas);
      },

      error: (err) => {
        console.error('ERROR CARGANDO RAZAS:', err);

        this.razas.set([]);
      },
    });
  }

  // ======================================================
  // TIPO DE EJEMPLAR
  // ======================================================

  elegirTipo(sexo: 'Macho' | 'Hembra'): void {
    this.sexo.set(sexo);

    this.error.set('');
    this.exito.set('');

    // Las yeguas no manejan precio ni documentos de respaldo
    if (sexo === 'Hembra') {
      this.precio.set(null);
      this.documentosPendientes.set([]);
    }

    this.paso.set('formulario');
  }

  // ======================================================
  // VOLVER
  // ======================================================

  volver(): void {
    this.paso.set('tipo');
  }

  // ======================================================
  // CANCELAR
  // ======================================================

  cancelar(): void {
    void this.router.navigate(['/marketplace']);
  }

  // ======================================================
  // RAZA
  // ======================================================

  onRazaChange(valor: string): void {
    if (!valor) {
      this.idRazaSeleccionada.set(null);

      return;
    }

    const id = Number(valor);

    this.idRazaSeleccionada.set(id);

    if (id !== -1) {
      this.razaPersonalizada.set('');
    }
  }

  // ======================================================
  // PRECIO
  // ======================================================

  onPrecioChange(valor: string): void {
    if (valor === null || valor === undefined || valor.trim() === '') {
      this.precio.set(null);

      return;
    }

    const valorNormalizado = valor.replace(',', '.');

    const numero = Number(valorNormalizado);

    if (Number.isNaN(numero)) {
      this.precio.set(null);

      return;
    }

    this.precio.set(numero);
  }

  // ======================================================
  // ALTURA
  // ======================================================

  onAlturaChange(valor: string): void {
    if (!valor) {
      this.altura.set(null);

      return;
    }

    const normalizado = valor.replace(',', '.');

    const numero = Number(normalizado);

    if (Number.isNaN(numero)) {
      this.altura.set(null);

      return;
    }

    this.altura.set(numero);
  }

  // ======================================================
  // DISPONIBILIDAD
  // ======================================================

  onDisponibilidadChange(valor: string): void {
    this.disponibilidad.set(valor as 'Disponible' | 'No disponible');
  }

  // ======================================================
  // FOTOS
  // ======================================================

  onFotosSeleccionadas(event: Event): void {
    const input = event.target as HTMLInputElement;

    this.fotosSeleccionadas.set(input.files ? Array.from(input.files) : []);
  }

  eliminarFoto(index: number): void {
    const actuales = this.fotosSeleccionadas();

    this.fotosSeleccionadas.set(actuales.filter((_, i) => i !== index));
  }

  // ======================================================
  // GUARDAR
  // ======================================================

  guardar(): void {
    this.error.set('');

    // ==================================================
    // SEXO
    // ==================================================

    if (!this.sexo()) {
      this.error.set('Selecciona si es Caballo o Yegua.');

      return;
    }

    // ==================================================
    // RAZA
    // ==================================================

    if (this.idRazaSeleccionada() === null) {
      this.error.set('Selecciona una raza.');

      return;
    }

    // ==================================================
    // OTRA RAZA
    // ==================================================

    if (this.razaEsOtro() && !this.razaPersonalizada().trim()) {
      this.error.set('Escribe la raza del ejemplar.');

      return;
    }
    // ==================================================
    // CAMPOS OBLIGATORIOS
    // ==================================================

    // AGREGA ESTO ANTES DE LOS CAMPOS OBLIGATORIOS:
    if (this.fechaNacimiento() > this.hoy) {
      this.error.set('La fecha de nacimiento no puede ser una fecha futura.');
      return;
    }

    // ==================================================
    // CAMPOS OBLIGATORIOS
    // ==================================================

    if (
      !this.nombre().trim() ||
      !this.fechaNacimiento() ||
      this.altura() === null ||
      this.altura()! <= 0 ||
      !this.color().trim() ||
      !this.ubicacion().trim() ||
      !this.descripcion().trim()
    ) {
      this.error.set('Completa todos los campos obligatorios.');

      return;
    }

    // ==================================================
    // PRECIO CABALLO
    // ==================================================

    if (this.sexo() === 'Macho') {
      if (this.precio() === null || this.precio()! <= 0) {
        this.error.set('Debes ingresar un precio válido para el caballo.');

        return;
      }
    }

    // ==================================================
    // FOTOS
    // ==================================================

    if (this.fotosSeleccionadas().length === 0) {
      this.error.set('Debes subir al menos una foto del ejemplar.');

      return;
    }

    // ==================================================
    // DOCUMENTOS (opcionales): se revisan antes de crear el caballo
    // ==================================================

    const errorDocumentos = errorDePendientes(this.documentosPendientes());

    if (errorDocumentos) {
      this.error.set(`Documentos de respaldo: ${errorDocumentos}`);

      return;
    }

    // ==================================================
    // CREAR OBJETO
    // ==================================================

    const datos: NuevaPublicacion = {
      nombre: this.nombre().trim(),

      sexo: this.sexo()!,

      fecha_nacimiento: this.fechaNacimiento(),

      altura: this.altura()!,

      color: this.color().trim(),

      ubicacion: this.ubicacion().trim(),

      descripcion: this.descripcion().trim(),

      disponibilidad: this.disponibilidad(),

      precio: this.sexo() === 'Macho' ? Number(this.precio()) : null,

      descendencia: this.descendencia(),
    };

    // ==================================================
    // RAZA
    // ==================================================

    if (this.razaEsOtro()) {
      datos.raza_personalizada = this.razaPersonalizada().trim();
    } else {
      datos.id_raza = this.idRazaSeleccionada()!;
    }

    // ==================================================
    // ENVIAR
    // ==================================================

    this.enviando.set(true);

    this.caballoService.crear(datos).subscribe({
      next: (respuesta) => {
        const fotos = this.fotosSeleccionadas();

        // Si es yegua, NO redirigir: mostrar banner de éxito
        const esYegua = this.sexo() === 'Hembra';

        // ============================================
        // SUBIR FOTOS (si hay)
        // ============================================

        const finalizar = (): void => {
          this.enviando.set(false);

          this.log.info('Caballo publicado', {
            id_caballo: respuesta.id_caballo,
            sexo: this.sexo(),
            fotos: fotos.length,
            documentos: documentos.length,
          });

          if (esYegua) {
            this.exito.set('Yegua registrada. Estará disponible en "Mis caballos".');
          } else {
            void this.router.navigate(['/marketplace']);
          }
        };

        // ============================================
        // SUBIR DOCUMENTOS (opcionales, solo machos)
        // ============================================

        const documentos = esYegua ? [] : this.documentosPendientes();

        const subirDocumentos = (): void => {
          if (documentos.length === 0) {
            finalizar();

            return;
          }

          this.documentoService.subir(respuesta.id_caballo, documentos).subscribe({
            next: () => finalizar(),

            error: (err) => {
              // El caballo ya quedó publicado: se avisa y se indica dónde reintentar
              this.log.error('Caballo creado, pero fallaron los documentos', {
                id_caballo: respuesta.id_caballo,
                documentos: documentos.length,
              });

              this.enviando.set(false);

              const detalle = typeof err?.error?.detail === 'string' ? ` (${err.error.detail})` : '';

              this.error.set(
                `El caballo se publicó, pero no se pudieron subir los documentos${detalle}. ` +
                  'Puedes agregarlos desde "Mis caballos" → Editar.',
              );
            },
          });
        };

        if (fotos.length === 0) {
          subirDocumentos();

          return;
        }

        this.caballoService.subirFotos(respuesta.id_caballo, fotos).subscribe({
          next: () => subirDocumentos(),

          error: (err) => {
            console.error('ERROR SUBIENDO FOTOS:', err);

            this.log.error('Caballo creado, pero fallaron las fotos', {
              id_caballo: respuesta.id_caballo,
              fotos: fotos.length,
            });

            this.enviando.set(false);

            this.error.set('Caballo creado, pero fallaron las fotos. Intenta de nuevo.');
          },
        });
      },

      error: (err) => {
        console.error('ERROR PUBLICACIÓN:', err);

        this.enviando.set(false);

        const detalle = err?.error?.detail;

        if (typeof detalle === 'string') {
          this.error.set(detalle);
        } else {
          this.error.set('No se pudo guardar la publicación. Intenta de nuevo.');
        }
      },
    });
  }
  irAlMarketplace(): void {
    void this.router.navigate(['/marketplace']);
  }
}
