import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DescendenciaFormComponent } from './descendencia-form.component';

describe('DescendenciaFormComponent', () => {
  let fixture: ComponentFixture<DescendenciaFormComponent>;
  let component: DescendenciaFormComponent;

  const html = () => fixture.nativeElement as HTMLElement;

  const campo = <T extends HTMLElement>(clave: string) =>
    html().querySelector(`#desc-${clave}`) as T;

  const escribir = (clave: string, valor: string, evento = 'input') => {
    const elemento = campo<HTMLInputElement>(clave);
    elemento.value = valor;
    elemento.dispatchEvent(new Event(evento));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DescendenciaFormComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(DescendenciaFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should start closed with every field empty', () => {
    expect((html().querySelector('details') as HTMLDetailsElement).open).toBe(false);
    expect(component.completados()).toBe(0);
    expect(html().querySelector('.desc-contador')?.textContent).toContain(
      `0 de ${component.totalCampos} completados`,
    );
    expect(html().querySelectorAll('fieldset').length).toBe(8);
  });

  it('should update the model from text, select, number and textarea fields', () => {
    escribir('padre_nombre', 'Rayo');
    escribir('modalidad', 'Trocha', 'change');
    escribir('crias_anteriores', '3');
    escribir('notas', 'Muy noble');

    expect(component.descendencia()).toEqual({
      padre_nombre: 'Rayo',
      modalidad: 'Trocha',
      crias_anteriores: 3,
      notas: 'Muy noble',
    });
    expect(component.completados()).toBe(4);
  });

  it('should treat empty or invalid values as no data', () => {
    escribir('padre_nombre', 'Rayo');
    escribir('padre_nombre', '   ');
    escribir('crias_anteriores', '-2');
    escribir('modalidad', '', 'change');

    expect(component.descendencia()).toEqual({
      padre_nombre: null,
      crias_anteriores: null,
      modalidad: null,
    });
    expect(component.completados()).toBe(0);
  });

  it('should show saved values when editing', () => {
    fixture.componentRef.setInput('descendencia', {
      madre_nombre: 'Paloma',
      temperamento: 'Dócil',
      crias_anteriores: 0,
    });
    fixture.detectChanges();

    expect(campo<HTMLInputElement>('madre_nombre').value).toBe('Paloma');
    expect(campo<HTMLSelectElement>('temperamento').value).toBe('Dócil');
    expect(campo<HTMLInputElement>('crias_anteriores').value).toBe('0');
    expect(component.completados()).toBe(3);
  });

  it('should limit lengths and offer the backend options', () => {
    expect(campo<HTMLInputElement>('padre_registro').maxLength).toBe(60);
    expect(campo<HTMLTextAreaElement>('notas').maxLength).toBe(2000);
    const opciones = Array.from(campo<HTMLSelectElement>('temperamento').options).map(
      (o) => o.value,
    );
    expect(opciones).toEqual(['', 'Tranquilo', 'Dócil', 'Activo', 'Nervioso', 'Dominante']);
    expect(campo<HTMLInputElement>('padre_logros').placeholder).toContain('Campeón');
  });
});
