import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelloRespaldoComponent, TEXTO_SELLO } from './sello-respaldo.component';

describe('SelloRespaldoComponent', () => {
  let fixture: ComponentFixture<SelloRespaldoComponent>;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SelloRespaldoComponent] }).compileComponents();
    fixture = TestBed.createComponent(SelloRespaldoComponent);
    host = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('es un ícono con nombre accesible y explicación al pasar el cursor', () => {
    expect(host.getAttribute('role')).toBe('img');
    expect(host.getAttribute('aria-label')).toBe(TEXTO_SELLO);
    expect(host.getAttribute('title')).toBe(TEXTO_SELLO);
    expect(TEXTO_SELLO).toContain('aportados por el propietario');
  });

  it('dibuja el sello en SVG, sin emojis', () => {
    expect(host.querySelector('svg .sr-roseta')).not.toBeNull();
    expect(host.querySelector('svg .sr-check')).not.toBeNull();
    expect(host.textContent?.trim()).toBe('');
  });

  it('acepta un tamaño', () => {
    fixture.componentRef.setInput('tamano', 26);
    fixture.detectChanges();
    expect(host.style.getPropertyValue('--tamano')).toBe('26px');
  });
});
