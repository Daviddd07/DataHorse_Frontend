import { TestBed } from '@angular/core/testing';
import { LogoIaComponent } from './logo-ia.component';

describe('LogoIaComponent', () => {
  const crear = (entradas: { tamano?: number; pensando?: boolean } = {}) => {
    const fixture = TestBed.createComponent(LogoIaComponent);
    Object.entries(entradas).forEach(([k, v]) => fixture.componentRef.setInput(k, v));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('should be decorative and sized by its input', () => {
    const logo = crear({ tamano: 40 });
    expect(logo.getAttribute('aria-hidden')).toBe('true');
    expect(logo.style.width).toBe('40px');
    expect(logo.style.height).toBe('40px');
    expect(logo.classList).not.toContain('pensando');
  });

  it('should mark the thinking state', () => {
    expect(crear({ pensando: true }).classList).toContain('pensando');
  });

  it('should give each logo its own gradient id', () => {
    const [a, b] = [crear(), crear()];
    const id = a.querySelector('linearGradient')?.id;

    expect(id).not.toBe(b.querySelector('linearGradient')?.id);
    expect(a.querySelector('.nucleo')?.getAttribute('fill')).toBe(`url(#${id})`);
  });
});
