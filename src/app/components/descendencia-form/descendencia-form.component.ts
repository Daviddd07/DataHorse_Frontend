import { Component, computed, model } from '@angular/core';

import { Descendencia, MODALIDADES, TEMPERAMENTOS } from '../../Services/caballo.service';

type ClaveDescendencia = keyof Descendencia;

interface Campo {
  clave: ClaveDescendencia;
  etiqueta: string;
  tipo: 'texto' | 'area' | 'opciones' | 'numero';
  max?: number;
  placeholder?: string;
  opciones?: readonly string[];
  completo?: boolean; // ocupa las dos columnas
}

interface Grupo {
  titulo: string;
  campos: Campo[];
}

const nombre = (clave: ClaveDescendencia, etiqueta = 'Nombre'): Campo => ({
  clave,
  etiqueta,
  tipo: 'texto',
  max: 120,
});

const raza = (clave: ClaveDescendencia, etiqueta = 'Raza'): Campo => ({
  clave,
  etiqueta,
  tipo: 'texto',
  max: 120,
});

// Los largos coinciden con la tabla descendencia del backend.
const GRUPOS: Grupo[] = [
  {
    titulo: 'Padre',
    campos: [
      nombre('padre_nombre'),
      raza('padre_raza'),
      { clave: 'padre_registro', etiqueta: 'N.º de registro', tipo: 'texto', max: 60 },
      {
        clave: 'padre_logros',
        etiqueta: 'Logros',
        tipo: 'texto',
        max: 500,
        placeholder: 'Ej. Campeón nacional 2020',
      },
    ],
  },
  {
    titulo: 'Madre',
    campos: [
      nombre('madre_nombre'),
      raza('madre_raza'),
      { clave: 'madre_registro', etiqueta: 'N.º de registro', tipo: 'texto', max: 60 },
      { clave: 'madre_logros', etiqueta: 'Logros', tipo: 'texto', max: 500 },
    ],
  },
  {
    titulo: 'Abuelos',
    campos: [
      nombre('abuelo_paterno_nombre', 'Abuelo paterno'),
      raza('abuelo_paterno_raza', 'Raza del abuelo paterno'),
      nombre('abuela_paterna_nombre', 'Abuela paterna'),
      raza('abuela_paterna_raza', 'Raza de la abuela paterna'),
      nombre('abuelo_materno_nombre', 'Abuelo materno'),
      raza('abuelo_materno_raza', 'Raza del abuelo materno'),
      nombre('abuela_materna_nombre', 'Abuela materna'),
      raza('abuela_materna_raza', 'Raza de la abuela materna'),
    ],
  },
  {
    titulo: 'Registro',
    campos: [
      {
        clave: 'asociacion_registro',
        etiqueta: 'Asociación o libro genealógico',
        tipo: 'texto',
        max: 150,
        placeholder: 'Ej. Fedequinas',
      },
      { clave: 'criadero_origen', etiqueta: 'Criadero de origen', tipo: 'texto', max: 150 },
    ],
  },
  {
    titulo: 'Aptitudes',
    campos: [
      {
        clave: 'modalidad',
        etiqueta: 'Andar o modalidad',
        tipo: 'opciones',
        opciones: MODALIDADES,
      },
      {
        clave: 'temperamento',
        etiqueta: 'Temperamento',
        tipo: 'opciones',
        opciones: TEMPERAMENTOS,
      },
    ],
  },
  {
    titulo: 'Salud',
    campos: [
      {
        clave: 'condiciones_hereditarias',
        etiqueta: 'Condiciones hereditarias conocidas',
        tipo: 'area',
        max: 2000,
        completo: true,
      },
      {
        clave: 'pruebas_geneticas',
        etiqueta: 'Pruebas genéticas realizadas',
        tipo: 'area',
        max: 2000,
        completo: true,
      },
    ],
  },
  {
    titulo: 'Crías anteriores',
    campos: [
      { clave: 'crias_anteriores', etiqueta: 'Número de crías', tipo: 'numero' },
      {
        clave: 'caracteristicas_crias',
        etiqueta: 'Características de las crías',
        tipo: 'area',
        max: 2000,
        completo: true,
      },
    ],
  },
  {
    titulo: 'Notas',
    campos: [
      {
        clave: 'notas',
        etiqueta: 'Otra información',
        tipo: 'area',
        max: 2000,
        completo: true,
        placeholder: 'Cualquier dato que no cabe en los campos anteriores',
      },
    ],
  },
];

const TOTAL_CAMPOS = GRUPOS.reduce((total, g) => total + g.campos.length, 0);

@Component({
  selector: 'app-descendencia-form',
  standalone: true,
  templateUrl: './descendencia-form.component.html',
  styleUrl: './descendencia-form.component.css',
})
export class DescendenciaFormComponent {
  // Uso: <app-descendencia-form [(descendencia)]="miSenal" />
  descendencia = model<Descendencia>({});

  readonly grupos = GRUPOS;

  readonly totalCampos = TOTAL_CAMPOS;

  completados = computed(
    () =>
      Object.values(this.descendencia()).filter((v) => v !== null && v !== undefined && v !== '')
        .length,
  );

  valor(clave: ClaveDescendencia): string {
    return String(this.descendencia()[clave] ?? '');
  }

  actualizar(campo: Campo, valor: string): void {
    this.descendencia.update((actual) => ({ ...actual, [campo.clave]: convertir(campo, valor) }));
  }
}

// Texto vacío = sin dato. El número de crías se guarda como entero (o sin dato).
function convertir(campo: Campo, valor: string): string | number | null {
  const limpio = valor.trim();

  if (!limpio) return null;

  if (campo.tipo !== 'numero') return valor;

  const numero = Number(limpio);
  return Number.isInteger(numero) && numero >= 0 ? numero : null;
}
