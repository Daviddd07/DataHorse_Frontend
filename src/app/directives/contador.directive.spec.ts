import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ContadorDirective } from './contador.directive';

@Component({
  standalone: true,
  imports: [ContadorDirective],
  template: `<strong [appContador]="valor()" [contadorDuracion]="1000"></strong>`,
})
class HostComponent {
  valor = signal(1500);
}

describe('ContadorDirective', () => {
  let frames: FrameRequestCallback[];
  let reducirMovimiento: boolean;

  const crear = () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture;
  };
  const texto = (fixture: ReturnType<typeof crear>) =>
    (fixture.nativeElement as HTMLElement).querySelector('strong')?.textContent;

  // Ejecuta los cuadros pendientes en el instante indicado
  // (Angular sin zone.js también agenda los suyos con requestAnimationFrame)
  const cuadro = (ms: number) => frames.splice(0).forEach((cb) => cb(ms));

  beforeEach(() => {
    frames = [];
    reducirMovimiento = false;
    vi.spyOn(performance, 'now').mockReturnValue(0);
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    window.matchMedia = vi.fn(() => ({ matches: reducirMovimiento })) as never;
  });

  afterEach(() => vi.unstubAllGlobals());

  it('should count up from 0 to the final value', () => {
    const fixture = crear();
    expect(texto(fixture)).toBe('0');

    cuadro(500);
    const aMitad = Number(texto(fixture)?.replace(/\D/g, ''));
    expect(aMitad).toBeGreaterThan(750); // ease-out: pasa la mitad antes de la mitad del tiempo
    expect(aMitad).toBeLessThan(1500);

    cuadro(1000);
    expect(texto(fixture)).toBe((1500).toLocaleString('es-CO'));
  });

  it('should animate from the previous value when it changes', () => {
    const fixture = crear();
    cuadro(1000);

    vi.mocked(performance.now).mockReturnValue(1000);
    fixture.componentInstance.valor.set(1000);
    fixture.detectChanges();
    expect(texto(fixture)).toBe((1500).toLocaleString('es-CO'));

    cuadro(2000);
    expect(texto(fixture)).toBe((1000).toLocaleString('es-CO'));
  });

  it('should show the value directly with reduced motion', () => {
    reducirMovimiento = true;
    const fixture = crear();
    expect(texto(fixture)).toBe((1500).toLocaleString('es-CO'));
  });
});
