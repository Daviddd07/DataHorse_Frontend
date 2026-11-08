import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EstrellasComponent } from './estrellas.component';
import { Calificacion } from '../../Services/conversacion.service';

describe('EstrellasComponent', () => {
  let fixture: ComponentFixture<EstrellasComponent>;

  const crear = (calificacion: Calificacion | null, compacto = false) => {
    fixture = TestBed.createComponent(EstrellasComponent);
    fixture.componentRef.setInput('calificacion', calificacion);
    fixture.componentRef.setInput('compacto', compacto);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  const rellenos = (html: HTMLElement) =>
    Array.from(html.querySelectorAll('.es-estrella')).map((e) =>
      (e as HTMLElement).style.getPropertyValue('--relleno'),
    );

  it('should fill the stars with the average and show the number of reviews', () => {
    const html = crear({ promedio: 3.5, total: 12 });
    expect(rellenos(html)).toEqual(['100%', '100%', '100%', '50%', '0%']);
    expect(html.querySelector('.es-promedio')?.textContent).toBe('3,5');
    expect(html.querySelector('.es-total')?.textContent).toBe('(12)');
    expect(html.getAttribute('aria-label')).toBe('3,5 de 5 estrellas, 12 reseñas');
  });

  it('should use singular for one review and hide the total when compact', () => {
    const html = crear({ promedio: 5, total: 1 }, true);
    expect(html.getAttribute('aria-label')).toBe('5,0 de 5 estrellas, 1 reseña');
    expect(html.querySelector('.es-total')).toBeNull();
    expect(html.classList.contains('compacto')).toBe(true);
  });

  it.each([null, { promedio: null, total: 0 }, { promedio: 4, total: 0 }])(
    'should say there are no reviews yet (%o)',
    (calificacion) => {
      const html = crear(calificacion as Calificacion | null);
      expect(html.textContent).toContain('Sin reseñas');
      expect(html.getAttribute('aria-label')).toBe('Sin reseñas todavía');
    },
  );
});
