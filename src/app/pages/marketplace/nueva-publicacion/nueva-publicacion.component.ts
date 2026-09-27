import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  CaballoService,
  Raza,
  NuevaPublicacion
} from '../../../Services/caballo.service';


type Paso = 'tipo' | 'formulario';


@Component({
  selector: 'app-nueva-publicacion',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './nueva-publicacion.component.html',
  styleUrl: './nueva-publicacion.component.css',
})
export class NuevaPublicacionComponent {

  private caballoService = inject(CaballoService);
  private router = inject(Router);


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


  razaEsOtro = computed(
    () => this.idRazaSeleccionada() === -1
  );


  // ======================================================
  // DATOS DEL EJEMPLAR
  // ======================================================

  nombre = signal('');

  fechaNacimiento = signal('');

  altura = signal<number | null>(null);

  color = signal('');

  ubicacion = signal('');

  descripcion = signal('');

  disponibilidad =
    signal<'Disponible' | 'No disponible'>(
      'Disponible'
    );


  // ======================================================
  // PRECIO
  // ======================================================

  precio = signal<number | null>(null);


  // ======================================================
  // ESTADO
  // ======================================================

  enviando = signal(false);

  error = signal('');


  // ======================================================
  // CONSTRUCTOR
  // ======================================================

  constructor() {

    this.caballoService
      .listarRazas()
      .subscribe({

        next: (razas) => {

          console.log(
            'RAZAS:',
            razas
          );

          this.razas.set(
            razas
          );
        },

        error: (err) => {

          console.error(
            'ERROR CARGANDO RAZAS:',
            err
          );

          this.razas.set([]);
        }

      });
  }


  // ======================================================
  // TIPO DE EJEMPLAR
  // ======================================================

  elegirTipo(
    sexo: 'Macho' | 'Hembra'
  ): void {

    this.sexo.set(
      sexo
    );


    // Las yeguas no manejan precio
    if (sexo === 'Hembra') {

      this.precio.set(
        null
      );
    }


    this.paso.set(
      'formulario'
    );
  }


  // ======================================================
  // VOLVER
  // ======================================================

  volver(): void {

    this.paso.set(
      'tipo'
    );
  }


  // ======================================================
  // CANCELAR
  // ======================================================

  cancelar(): void {

    this.router.navigate([
      '/marketplace'
    ]);
  }


  // ======================================================
  // RAZA
  // ======================================================

  onRazaChange(
    valor: string
  ): void {

    if (!valor) {

      this.idRazaSeleccionada.set(
        null
      );

      return;
    }


    const id = Number(valor);

    this.idRazaSeleccionada.set(
      id
    );


    if (id !== -1) {

      this.razaPersonalizada.set(
        ''
      );
    }
  }


  // ======================================================
  // PRECIO
  // ======================================================

  onPrecioChange(
    valor: string
  ): void {

    if (
      valor === null ||
      valor === undefined ||
      valor.trim() === ''
    ) {

      this.precio.set(
        null
      );

      return;
    }


    /*
      Permite:
      3400000
      3400000.50
      3400000,50
    */

    const valorNormalizado =
      valor.replace(',', '.');


    const numero =
      Number(valorNormalizado);


    if (
      Number.isNaN(numero)
    ) {

      this.precio.set(
        null
      );

      return;
    }


    this.precio.set(
      numero
    );


    console.log(
      'PRECIO ACTUAL:',
      numero
    );
  }


  // ======================================================
  // ALTURA
  // ======================================================

  onAlturaChange(
    valor: string
  ): void {

    if (!valor) {

      this.altura.set(
        null
      );

      return;
    }


    const normalizado =
      valor.replace(',', '.');


    const numero =
      Number(normalizado);


    if (
      Number.isNaN(numero)
    ) {

      this.altura.set(
        null
      );

      return;
    }


    this.altura.set(
      numero
    );
  }


  // ======================================================
  // DISPONIBILIDAD
  // ======================================================

  onDisponibilidadChange(
    valor: string
  ): void {

    this.disponibilidad.set(
      valor as
        | 'Disponible'
        | 'No disponible'
    );
  }


  // ======================================================
  // GUARDAR
  // ======================================================

  guardar(): void {

    console.log(
      'ENTRÓ A GUARDAR'
    );

    console.log(
      'PRECIO ANTES DE GUARDAR:',
      this.precio()
    );


    this.error.set('');


    // ==================================================
    // SEXO
    // ==================================================

    if (!this.sexo()) {

      this.error.set(
        'Selecciona si es Caballo o Yegua.'
      );

      return;
    }


    // ==================================================
    // RAZA
    // ==================================================

    if (
      this.idRazaSeleccionada() === null
    ) {

      this.error.set(
        'Selecciona una raza.'
      );

      return;
    }


    // ==================================================
    // OTRA RAZA
    // ==================================================

    if (
      this.razaEsOtro() &&
      !this.razaPersonalizada().trim()
    ) {

      this.error.set(
        'Escribe la raza del ejemplar.'
      );

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

      this.error.set(
        'Completa todos los campos obligatorios.'
      );

      return;
    }


    // ==================================================
    // PRECIO CABALLO
    // ==================================================

    if (
      this.sexo() === 'Macho'
    ) {

      if (
        this.precio() === null ||
        this.precio()! <= 0
      ) {

        this.error.set(
          'Debes ingresar un precio válido para el caballo.'
        );

        return;
      }
    }


    // ==================================================
    // CREAR OBJETO
    // ==================================================

    const datos: NuevaPublicacion = {

      nombre:
        this.nombre().trim(),

      sexo:
        this.sexo()!,

      fecha_nacimiento:
        this.fechaNacimiento(),

      altura:
        this.altura()!,

      color:
        this.color().trim(),

      ubicacion:
        this.ubicacion().trim(),

      descripcion:
        this.descripcion().trim(),

      disponibilidad:
        this.disponibilidad(),

      precio:
        this.sexo() === 'Macho'
          ? Number(this.precio())
          : null
    };


    // ==================================================
    // RAZA
    // ==================================================

    if (
      this.razaEsOtro()
    ) {

      datos.raza_personalizada =
        this.razaPersonalizada()
          .trim();

    } else {

      datos.id_raza =
        this.idRazaSeleccionada()!;
    }


    console.log(
      'JSON FINAL A ENVIAR:',
      datos
    );


    // ==================================================
    // ENVIAR
    // ==================================================

    this.enviando.set(
      true
    );


    this.caballoService
      .crear(datos)
      .subscribe({

        next: (respuesta) => {

          console.log(
            'PUBLICACIÓN GUARDADA:',
            respuesta
          );


          this.enviando.set(
            false
          );


          this.router.navigate([
            '/marketplace'
          ]);
        },


        error: (err) => {

          console.error(
            'ERROR PUBLICACIÓN:',
            err
          );


          this.enviando.set(
            false
          );


          const detalle =
            err?.error?.detail;


          if (
            typeof detalle === 'string'
          ) {

            this.error.set(
              detalle
            );

          } else {

            this.error.set(
              'No se pudo guardar la publicación. Intenta de nuevo.'
            );
          }
        }

      });
  }
}