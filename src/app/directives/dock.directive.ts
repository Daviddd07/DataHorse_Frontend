import { Directive, ElementRef, NgZone, OnDestroy, OnInit, inject } from '@angular/core';

// Distancia (px) a partir de la cual un ítem ya no crece, y escala del ítem bajo el cursor
export const ALCANCE_DOCK = 100;
export const ESCALA_MAX_DOCK = 1.3;

// Resortes: escala de los íconos y posición vertical del tooltip
const RESORTE_ESCALA = { rigidez: 300, amortiguacion: 25, masa: 0.5 };
const RESORTE_TOOLTIP = { rigidez: 400, amortiguacion: 30, masa: 1 };
const SEPARACION_TOOLTIP = 12;

interface Resorte {
  valor: number;
  velocidad: number;
  destino: number;
}

/**
 * Magnificación tipo Dock de macOS (en vertical) y un único tooltip que acompaña al cursor.
 *
 * Uso: `<aside appDock>` con ítems `<button data-dock-item aria-label="...">`. El texto del
 * tooltip es el aria-label; `data-dock-peligro` lo pinta en rojo y la clase `active` le pone
 * el punto dorado. La escala se aplica con la variable CSS `--dock-escala` en cada ítem.
 */
@Directive({
  selector: '[appDock]',
  standalone: true,
})
export class DockDirective implements OnInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly zone = inject(NgZone);

  private items: HTMLElement[] = [];
  private centros: number[] = [];
  private escalas = new Map<HTMLElement, Resorte>();
  private cursorY: number | null = null;

  private tooltip: HTMLElement | null = null;
  private texto: HTMLElement | null = null;
  private itemTooltip: HTMLElement | null = null;
  private posTooltip: Resorte = { valor: 0, velocidad: 0, destino: 0 };
  private tooltipVisible = false;

  private frame = 0;
  private ultimoTiempo = 0;
  private temporizadorTexto: ReturnType<typeof setTimeout> | undefined;
  private readonly limpiezas: (() => void)[] = [];

  ngOnInit(): void {
    this.crearTooltip();

    // Fuera de Angular: el movimiento del mouse no debe disparar la detección de cambios
    this.zone.runOutsideAngular(() => {
      this.escuchar(this.host, 'pointerenter', () => this.medir());
      this.escuchar(this.host, 'pointermove', (e) => this.alMover(e as PointerEvent));
      this.escuchar(this.host, 'pointerleave', () => this.alSalir());
      this.escuchar(this.host, 'focusin', (e) => this.alEnfocar(e as FocusEvent));
      this.escuchar(this.host, 'focusout', (e) => this.alDesenfocar(e as FocusEvent));
    });
  }

  ngOnDestroy(): void {
    this.limpiezas.forEach((quitar) => quitar());
    this.detenerAnimacion();
    clearTimeout(this.temporizadorTexto);
    this.tooltip?.remove();
  }

  // ======================================================
  // EVENTOS
  // ======================================================

  private alMover(e: PointerEvent): void {
    if (!this.esVertical()) return;
    if (!this.items.length) this.medir();
    this.cursorY = e.clientY;

    const item = (e.target as HTMLElement).closest<HTMLElement>('[data-dock-item]');
    if (item && this.host.contains(item)) this.mostrarTooltip(item);
    else this.ocultarTooltip(); // separadores y espacio vacío entre grupos

    this.actualizarDestinos();
  }

  private alSalir(): void {
    this.cursorY = null;
    this.ocultarTooltip(true);
    this.actualizarDestinos();
  }

  private alEnfocar(e: FocusEvent): void {
    const item = (e.target as HTMLElement).closest<HTMLElement>('[data-dock-item]');
    if (!item || !item.matches(':focus-visible') || !this.esVertical()) return;

    this.medir();
    this.cursorY = this.centros[this.items.indexOf(item)];
    this.mostrarTooltip(item);
    this.actualizarDestinos();
  }

  private alDesenfocar(e: FocusEvent): void {
    // Si el foco pasa a otro ítem de la barra, focusin se encarga
    if (e.relatedTarget instanceof Node && this.host.contains(e.relatedTarget)) return;
    this.alSalir();
  }

  // ======================================================
  // MAGNIFICACIÓN
  // ======================================================

  // Centros en reposo: se miden al entrar para que el crecimiento no mueva la referencia
  private medir(): void {
    this.items = Array.from(this.host.querySelectorAll<HTMLElement>('[data-dock-item]'));
    this.centros = this.items.map((item) => {
      const caja = item.getBoundingClientRect();
      const escala = this.escalas.get(item)?.valor ?? 1;
      return caja.top + caja.height / 2 - this.margenPorEscala(item, escala);
    });
    this.items.forEach((item) => {
      if (!this.escalas.has(item)) this.escalas.set(item, { valor: 1, velocidad: 0, destino: 1 });
    });
  }

  private actualizarDestinos(): void {
    const sinMovimiento = this.reducirMovimiento();

    this.items.forEach((item, i) => {
      const resorte = this.escalas.get(item);
      if (!resorte) return;
      resorte.destino =
        this.cursorY === null || sinMovimiento
          ? 1
          : escalaPorDistancia(Math.abs(this.cursorY - this.centros[i]));
    });

    this.animar();
  }

  private aplicarEscala(item: HTMLElement, escala: number): void {
    item.style.setProperty('--dock-escala', escala.toFixed(4));
  }

  // Desplazamiento que el margen extra le añade al centro del ítem (la mitad de lo que crece)
  private margenPorEscala(item: HTMLElement, escala: number): number {
    return ((escala - 1) * item.offsetHeight) / 2;
  }

  // ======================================================
  // TOOLTIP (uno solo, montado en <body> para que la barra no lo recorte)
  // ======================================================

  private crearTooltip(): void {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'dock-tooltip';
    this.tooltip.setAttribute('aria-hidden', 'true'); // el nombre accesible es el aria-label
    this.texto = document.createElement('span');
    this.texto.className = 'dock-tooltip-texto';
    this.tooltip.appendChild(this.texto);
    document.body.appendChild(this.tooltip);
  }

  private mostrarTooltip(item: HTMLElement): void {
    if (!this.tooltip || !this.texto || item === this.itemTooltip) return;

    const yaVisible = this.tooltipVisible;
    this.itemTooltip = item;
    this.tooltipVisible = true;

    const etiqueta = item.getAttribute('aria-label') ?? '';
    this.tooltip.classList.toggle('dock-tooltip-peligro', item.hasAttribute('data-dock-peligro'));
    this.tooltip.classList.toggle('dock-tooltip-activo', item.classList.contains('active'));
    this.tooltip.style.left = `${this.host.getBoundingClientRect().right + SEPARACION_TOOLTIP}px`;

    const centro = this.centroActual(item);
    if (yaVisible && !this.reducirMovimiento()) {
      // Cambio entre ítems: se desliza con resorte y el texto cambia con un fundido corto
      this.posTooltip.destino = centro;
      this.tooltip.classList.add('dock-tooltip-cambiando');
      clearTimeout(this.temporizadorTexto);
      this.temporizadorTexto = setTimeout(() => {
        this.ponerTexto(etiqueta);
        this.tooltip?.classList.remove('dock-tooltip-cambiando');
      }, 100);
    } else {
      // Primera aparición (o tras el espacio vacío): aparece en su sitio con la animación de entrada
      this.posTooltip = { valor: centro, velocidad: 0, destino: centro };
      this.ponerTexto(etiqueta);
      this.tooltip.classList.remove('dock-tooltip-cambiando', 'dock-tooltip-saliendo');
      this.tooltip.classList.add('dock-tooltip-visible');
    }

    this.moverTooltip(this.posTooltip.valor);
    this.animar();
  }

  private ocultarTooltip(saliendoDeLaBarra = false): void {
    if (!this.tooltip || !this.tooltipVisible) return;
    this.tooltipVisible = false;
    this.itemTooltip = null;
    clearTimeout(this.temporizadorTexto);
    this.tooltip.classList.remove('dock-tooltip-visible', 'dock-tooltip-cambiando');
    this.tooltip.classList.toggle('dock-tooltip-saliendo', saliendoDeLaBarra);
  }

  private ponerTexto(etiqueta: string): void {
    if (!this.tooltip || !this.texto) return;
    this.texto.textContent = etiqueta;
    // Ancho explícito para que la transición de CSS anime el cambio de tamaño
    this.tooltip.style.width = `${this.texto.scrollWidth + 20 + (this.tooltip.classList.contains('dock-tooltip-activo') ? 10 : 0)}px`;
  }

  private moverTooltip(y: number): void {
    this.tooltip?.style.setProperty('--dock-tooltip-y', `${y.toFixed(1)}px`);
  }

  // Centro real (ya magnificado) del ítem, para alinear el tooltip con lo que se ve
  private centroActual(item: HTMLElement): number {
    const caja = item.getBoundingClientRect();
    return caja.top + caja.height / 2;
  }

  // ======================================================
  // BUCLE DE ANIMACIÓN (resortes integrados por cuadro)
  // ======================================================

  private animar(): void {
    if (!this.puedeAnimar()) {
      // Sin requestAnimationFrame (p. ej. en pruebas): se salta directo al destino
      this.escalas.forEach((r, item) => {
        r.valor = r.destino;
        this.aplicarEscala(item, r.valor);
      });
      this.posTooltip.valor = this.posTooltip.destino;
      this.moverTooltip(this.posTooltip.valor);
      return;
    }
    if (this.frame) return;

    this.ultimoTiempo = performance.now();
    const paso = (ahora: number) => {
      const dt = Math.min((ahora - this.ultimoTiempo) / 1000, 1 / 30);
      this.ultimoTiempo = ahora;
      let enMovimiento = false;

      this.escalas.forEach((r, item) => {
        enMovimiento = avanzarResorte(r, RESORTE_ESCALA, dt) || enMovimiento;
        this.aplicarEscala(item, r.valor);
      });

      if (this.tooltipVisible && this.itemTooltip) {
        // El ítem crece mientras tanto: el destino sigue su centro real
        this.posTooltip.destino = this.centroActual(this.itemTooltip);
        enMovimiento = avanzarResorte(this.posTooltip, RESORTE_TOOLTIP, dt) || enMovimiento;
        this.moverTooltip(this.posTooltip.valor);
      }

      this.frame = enMovimiento ? requestAnimationFrame(paso) : 0;
    };
    this.frame = requestAnimationFrame(paso);
  }

  private detenerAnimacion(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  // En pantallas angostas la barra del admin pasa a ser horizontal: ahí no aplica el Dock vertical
  private esVertical(): boolean {
    const caja = this.host.getBoundingClientRect();
    return caja.height >= caja.width;
  }

  private puedeAnimar(): boolean {
    return typeof requestAnimationFrame === 'function' && !this.reducirMovimiento();
  }

  private reducirMovimiento(): boolean {
    return (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  private escuchar(objetivo: EventTarget, evento: string, fn: (e: Event) => void): void {
    objetivo.addEventListener(evento, fn);
    this.limpiezas.push(() => objetivo.removeEventListener(evento, fn));
  }
}

// Escala continua: ESCALA_MAX_DOCK bajo el cursor y 1 a ALCANCE_DOCK px o más
export function escalaPorDistancia(distancia: number): number {
  const t = Math.max(0, 1 - distancia / ALCANCE_DOCK);
  return 1 + (ESCALA_MAX_DOCK - 1) * t;
}

// Un paso del resorte amortiguado; devuelve true mientras siga en movimiento
function avanzarResorte(
  r: Resorte,
  { rigidez, amortiguacion, masa }: { rigidez: number; amortiguacion: number; masa: number },
  dt: number,
): boolean {
  const fuerza = -rigidez * (r.valor - r.destino) - amortiguacion * r.velocidad;
  r.velocidad += (fuerza / masa) * dt;
  r.valor += r.velocidad * dt;

  if (Math.abs(r.valor - r.destino) < 0.001 && Math.abs(r.velocidad) < 0.01) {
    r.valor = r.destino;
    r.velocidad = 0;
    return false;
  }
  return true;
}
