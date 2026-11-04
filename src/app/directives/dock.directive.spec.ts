import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ALCANCE_DOCK, DockDirective, ESCALA_MAX_DOCK, escalaPorDistancia } from './dock.directive';

@Component({
  standalone: true,
  imports: [DockDirective],
  template: `
    <aside appDock>
      <button data-dock-item aria-label="Inicio" class="active"></button>
      <button data-dock-item aria-label="Favoritos"></button>
      <span class="separador"></span>
      <button data-dock-item data-dock-peligro aria-label="Cerrar sesión"></button>
    </aside>
  `,
})
class HostComponent {}

describe('DockDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let barra: HTMLElement;
  let botones: HTMLButtonElement[];

  // Centros en reposo de cada botón (px): dos juntos arriba y uno lejos abajo
  const CENTROS = [50, 102, 400];

  const tooltip = () => document.body.querySelector('.dock-tooltip') as HTMLElement;
  const escala = (b: HTMLElement) => Number(b.style.getPropertyValue('--dock-escala') || 1);
  const mover = (objetivo: HTMLElement, clientY: number) =>
    objetivo.dispatchEvent(new MouseEvent('pointermove', { clientY, bubbles: true }));

  // Cuadros de animación controlados: el resorte avanza 16 ms por cuadro hasta asentarse
  let cuadros: FrameRequestCallback[] = [];
  let ahora = 0;
  const asentar = () => {
    for (let i = 0; i < 300 && cuadros.length; i++) {
      ahora += 16;
      cuadros.splice(0).forEach((cb) => cb(ahora));
    }
  };

  beforeEach(() => {
    cuadros = [];
    ahora = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => ahora);
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => cuadros.push(cb));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never;
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    barra = fixture.nativeElement.querySelector('aside');
    botones = Array.from(barra.querySelectorAll('button'));
    botones.forEach((b, i) => {
      vi.spyOn(b, 'getBoundingClientRect').mockReturnValue({
        top: CENTROS[i] - 23,
        height: 46,
        right: 70,
      } as DOMRect);
    });
    vi.spyOn(barra, 'getBoundingClientRect').mockReturnValue({
      right: 92,
      width: 68,
      height: 600,
    } as DOMRect);
    barra.dispatchEvent(new MouseEvent('pointerenter'));
  });

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
  });

  it('should map distance to a continuous scale', () => {
    expect(escalaPorDistancia(0)).toBe(ESCALA_MAX_DOCK);
    expect(escalaPorDistancia(ALCANCE_DOCK / 2)).toBeCloseTo(1.15);
    expect(escalaPorDistancia(ALCANCE_DOCK)).toBe(1);
    expect(escalaPorDistancia(ALCANCE_DOCK * 3)).toBe(1);
  });

  it('should magnify the item under the cursor and its neighbours less', () => {
    mover(botones[0], CENTROS[0]);
    expect(escala(botones[0])).toBe(1); // el resorte arranca desde el reposo

    asentar();
    expect(escala(botones[0])).toBeCloseTo(1.3);
    expect(escala(botones[1])).toBeCloseTo(1.144); // a 52 px
    expect(escala(botones[2])).toBe(1); // el otro grupo no se mueve
  });

  it('should show a single tooltip next to the bar with the item label', () => {
    mover(botones[1], CENTROS[1]);

    expect(document.body.querySelectorAll('.dock-tooltip').length).toBe(1);
    expect(tooltip().classList).toContain('dock-tooltip-visible');
    expect(tooltip().textContent).toBe('Favoritos');
    expect(tooltip().style.left).toBe('104px'); // borde de la barra + 12 px
    expect(tooltip().style.getPropertyValue('--dock-tooltip-y')).toBe('102.0px');
    expect(tooltip().getAttribute('aria-hidden')).toBe('true');
  });

  it('should mark the active item and the destructive action', () => {
    mover(botones[0], CENTROS[0]);
    expect(tooltip().classList).toContain('dock-tooltip-activo');
    expect(tooltip().classList).not.toContain('dock-tooltip-peligro');

    mover(barra.querySelector('.separador') as HTMLElement, 250);
    mover(botones[2], CENTROS[2]);
    expect(tooltip().textContent).toBe('Cerrar sesión');
    expect(tooltip().classList).toContain('dock-tooltip-peligro');
    expect(tooltip().classList).not.toContain('dock-tooltip-activo');
  });

  it('should hide the tooltip over the empty space between groups', () => {
    mover(botones[1], CENTROS[1]);
    mover(barra.querySelector('.separador') as HTMLElement, 250);

    expect(tooltip().classList).not.toContain('dock-tooltip-visible');
    expect(tooltip().classList).not.toContain('dock-tooltip-saliendo');
  });

  it('should reset everything when the cursor leaves the bar', () => {
    mover(botones[0], CENTROS[0]);
    asentar();
    barra.dispatchEvent(new MouseEvent('pointerleave'));
    asentar();

    expect(botones.map(escala)).toEqual([1, 1, 1]);
    expect(tooltip().classList).toContain('dock-tooltip-saliendo');
    expect(tooltip().classList).not.toContain('dock-tooltip-visible');
  });

  it('should not magnify with reduced motion', () => {
    vi.mocked(window.matchMedia).mockReturnValue({ matches: true } as MediaQueryList);
    mover(botones[0], CENTROS[0]);

    expect(botones.map(escala)).toEqual([1, 1, 1]);
    expect(tooltip().classList).toContain('dock-tooltip-visible');
  });

  it('should do nothing while the bar is horizontal (narrow screens)', () => {
    vi.mocked(barra.getBoundingClientRect).mockReturnValue({
      right: 900,
      width: 900,
      height: 60,
    } as DOMRect);
    mover(botones[0], CENTROS[0]);
    asentar();

    expect(botones.map(escala)).toEqual([1, 1, 1]);
    expect(tooltip().classList).not.toContain('dock-tooltip-visible');
  });

  it('should remove the tooltip from the page when destroyed', () => {
    fixture.destroy();
    expect(tooltip()).toBeNull();
  });
});
