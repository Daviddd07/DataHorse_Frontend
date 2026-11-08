import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EstadoConexionComponent, haceCuanto } from './estado-conexion.component';
import { EstadoConexion } from '../../Services/conversacion.service';

describe('haceCuanto', () => {
  const ahora = new Date('2026-11-08T15:00:00');

  it.each([
    ['2026-11-08T14:59:40', 'hace un momento'],
    ['2026-11-08T14:50:00', 'hace 10 min'],
    ['2026-11-08T12:00:00', 'hace 3 h'],
    ['2026-11-07T14:00:00', 'hace 1 día'],
    ['2026-11-01T15:00:00', 'hace 7 días'],
    ['no es fecha', ''],
  ])('%s -> "%s"', (desde, esperado) => {
    expect(haceCuanto(desde, ahora)).toBe(esperado);
  });

  it('should use the current time by default', () => {
    expect(haceCuanto(new Date().toISOString())).toBe('hace un momento');
  });
});

describe('EstadoConexionComponent', () => {
  let fixture: ComponentFixture<EstadoConexionComponent>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-08T15:00:00'));
  });

  afterEach(() => vi.useRealTimers());

  const crear = (conexion: EstadoConexion | null, soloPunto = false) => {
    fixture = TestBed.createComponent(EstadoConexionComponent);
    fixture.componentRef.setInput('conexion', conexion);
    fixture.componentRef.setInput('soloPunto', soloPunto);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('should show "En línea" with a green dot', () => {
    const html = crear({ en_linea: true, ultima_conexion: '2026-11-08T14:00:00' });
    expect(html.textContent?.trim()).toBe('En línea');
    expect(html.classList.contains('en-linea')).toBe(true);
  });

  it('should show when the person was last seen', () => {
    const html = crear({ en_linea: false, ultima_conexion: '2026-11-08T14:50:00' });
    expect(html.textContent?.trim()).toBe('Inactivo · visto hace 10 min');
    expect(html.classList.contains('en-linea')).toBe(false);
  });

  it('should refresh "visto hace" every minute', () => {
    const html = crear({ en_linea: false, ultima_conexion: '2026-11-08T14:50:00' });
    vi.advanceTimersByTime(5 * 60_000);
    fixture.detectChanges();
    expect(html.textContent?.trim()).toBe('Inactivo · visto hace 15 min');
  });

  it.each([
    null,
    { en_linea: false, ultima_conexion: null },
    { en_linea: false, ultima_conexion: 'x' },
  ])('should show only "Inactivo" without a valid last connection (%o)', (conexion) => {
    expect(crear(conexion as EstadoConexion | null).textContent?.trim()).toBe('Inactivo');
  });

  it('should show only the dot and keep the text for screen readers', () => {
    const html = crear({ en_linea: true, ultima_conexion: null }, true);
    expect(html.classList.contains('solo-punto')).toBe(true);
    expect(html.querySelector('.ec-oculto')?.textContent).toBe('En línea');
    expect(html.getAttribute('title')).toBe('En línea');
  });

  it('should stop the clock when destroyed', () => {
    crear({ en_linea: false, ultima_conexion: '2026-11-08T14:50:00' });
    const limpiar = vi.spyOn(globalThis, 'clearInterval');
    fixture.destroy();
    expect(limpiar).toHaveBeenCalled();
  });
});
