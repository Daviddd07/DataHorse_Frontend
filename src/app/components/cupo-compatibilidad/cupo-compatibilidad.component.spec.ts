import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CupoCompatibilidadComponent } from './cupo-compatibilidad.component';

describe('CupoCompatibilidadComponent', () => {
  let fixture: ComponentFixture<CupoCompatibilidadComponent>;

  const texto = () => (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CupoCompatibilidadComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(CupoCompatibilidadComponent);
  });

  it('should render nothing without data', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('output')).toBeNull();
  });

  it('should show the remaining estimations', () => {
    fixture.componentRef.setInput('cupo', { limite: 5, usadas: 1, restantes: 4 });
    fixture.detectChanges();
    expect(texto()).toContain('Te quedan 4 de 5 estimaciones hoy');
    expect(fixture.nativeElement.querySelector('.cupo-agotado')).toBeNull();
  });

  it('should warn when there are none left', () => {
    fixture.componentRef.setInput('cupo', { limite: 5, usadas: 5, restantes: 0 });
    fixture.detectChanges();
    expect(texto()).toContain('Usaste tus 5 estimaciones de hoy');
    expect(fixture.nativeElement.querySelector('.cupo-agotado')).not.toBeNull();
  });
});
