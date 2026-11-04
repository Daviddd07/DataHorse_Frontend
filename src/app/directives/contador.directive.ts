import { Directive, ElementRef, OnDestroy, effect, inject, input } from '@angular/core';

// Anima un número desde su valor anterior (0 la primera vez) hasta el nuevo, como en los dashboards.
// Con "reducir movimiento" activo, o sin soporte de animación (p. ej. en las pruebas), muestra el valor directo.
@Directive({
  selector: '[appContador]',
  standalone: true,
})
export class ContadorDirective implements OnDestroy {
  readonly appContador = input.required<number>();
  readonly duracion = input(1200, { alias: 'contadorDuracion' });
  readonly retraso = input(0, { alias: 'contadorRetraso' });

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private actual = 0;
  private frame = 0;

  constructor() {
    effect(() => this.animar(this.appContador(), this.duracion(), this.retraso()));
  }

  ngOnDestroy(): void {
    this.detener();
  }

  private animar(hasta: number, duracion: number, retraso: number): void {
    if (!this.puedeAnimar()) {
      this.mostrar(hasta);
      return;
    }

    this.detener();
    const desde = this.actual;
    const inicio = performance.now() + retraso;

    const paso = (ahora: number) => {
      const t = Math.min(1, Math.max(0, (ahora - inicio) / duracion));
      const suavizado = 1 - Math.pow(1 - t, 3); // ease-out: rápido al inicio, frena al llegar

      this.mostrar(desde + (hasta - desde) * suavizado);

      if (t < 1) this.frame = requestAnimationFrame(paso);
    };

    this.mostrar(desde);
    this.frame = requestAnimationFrame(paso);
  }

  private detener(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private mostrar(valor: number): void {
    this.actual = valor;
    this.el.nativeElement.textContent = Math.round(valor).toLocaleString('es-CO');
  }

  private puedeAnimar(): boolean {
    return (
      typeof requestAnimationFrame === 'function' &&
      typeof window.matchMedia === 'function' &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }
}
