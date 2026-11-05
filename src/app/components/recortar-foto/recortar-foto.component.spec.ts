import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LADO_SALIDA, RecortarFotoComponent, ZOOM_MAXIMO } from './recortar-foto.component';

describe('RecortarFotoComponent', () => {
  let fixture: ComponentFixture<RecortarFotoComponent>;
  let component: RecortarFotoComponent;
  const crearUrlOriginal = URL.createObjectURL;
  const revocarUrlOriginal = URL.revokeObjectURL;

  // Marco de 300 px y foto horizontal de 1200 × 800 (cubre el cuadrado con escala 0,375)
  const LADO = 300;

  const html = () => fixture.nativeElement as HTMLElement;
  const presionar = (x: number, y: number) =>
    component.alPresionar({ pointerId: 1, clientX: x, clientY: y, currentTarget: html() } as never);
  const arrastrar = (x: number, y: number) =>
    component.alArrastrar({ pointerId: 1, clientX: x, clientY: y } as never);

  beforeEach(async () => {
    URL.createObjectURL = vi.fn(() => 'blob:foto');
    URL.revokeObjectURL = vi.fn();
    await TestBed.configureTestingModule({ imports: [RecortarFotoComponent] }).compileComponents();
    fixture = TestBed.createComponent(RecortarFotoComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('archivo', new File(['x'], 'yo.png', { type: 'image/png' }));
    fixture.detectChanges();
    component.lado.set(LADO);
    component.iniciar(1200, 800);
    fixture.detectChanges();
  });

  afterEach(() => {
    URL.createObjectURL = crearUrlOriginal;
    URL.revokeObjectURL = revocarUrlOriginal;
  });

  it('should open as an accessible dialog showing the chosen image', () => {
    const dialogo = html().querySelector('[role="dialog"]');
    expect(dialogo?.getAttribute('aria-modal')).toBe('true');
    expect(dialogo?.textContent).toContain('Ajusta tu foto de perfil');
    expect((html().querySelector('.rf-imagen') as HTMLImageElement).src).toContain('blob:foto');
  });

  it('should start centered, covering the whole square', () => {
    expect(component.escala()).toBeCloseTo(0.375);
    expect(component.x()).toBeCloseTo(-75); // (300 - 450) / 2
    expect(component.y()).toBe(0);
  });

  it('should drag the photo but never leave empty space in the square', () => {
    presionar(100, 100);
    arrastrar(130, 100);
    expect(component.x()).toBeCloseTo(-45);

    arrastrar(500, 400); // demasiado a la derecha y abajo
    expect(component.x()).toBe(0);
    expect(component.y()).toBe(0);

    arrastrar(-500, -400); // demasiado a la izquierda y arriba
    expect(component.x()).toBeCloseTo(-150);
    expect(component.y()).toBe(0);

    component.alSoltar();
    arrastrar(0, 0);
    expect(component.x()).toBeCloseTo(-150); // ya no arrastra
  });

  it('should zoom keeping the center of the square fixed', () => {
    const zonaAntes = component.zonaRecorte();
    const centroAntes = zonaAntes.x + zonaAntes.lado / 2;

    component.cambiarZoom(2);

    const zona = component.zonaRecorte();
    expect(zona.lado).toBeCloseTo(zonaAntes.lado / 2);
    expect(zona.x + zona.lado / 2).toBeCloseTo(centroAntes);
  });

  it('should keep the zoom between 1 and the maximum', () => {
    component.cambiarZoom(99);
    expect(component.zoom()).toBe(ZOOM_MAXIMO);
    component.cambiarZoom(0.2);
    expect(component.zoom()).toBe(1);

    component.acercar();
    expect(component.zoom()).toBeCloseTo(1.2);
    component.alejar();
    expect(component.zoom()).toBeCloseTo(1);
  });

  it('should zoom with the mouse wheel', () => {
    const evento = { deltaY: -100, preventDefault: vi.fn() } as unknown as WheelEvent;
    component.alRuedaMouse(evento);
    expect(evento.preventDefault).toHaveBeenCalled();
    expect(component.zoom()).toBeCloseTo(1.1);
  });

  it('should move the photo with the arrow keys', () => {
    const tecla = (key: string) => ({ key, preventDefault: vi.fn() }) as unknown as KeyboardEvent;
    component.alTeclaMarco(tecla('ArrowRight'));
    expect(component.x()).toBeCloseTo(-85);
    component.alTeclaMarco(tecla('ArrowLeft'));
    expect(component.x()).toBeCloseTo(-75);
  });

  it('should crop exactly what is visible inside the square', () => {
    component.cambiarZoom(2);
    presionar(0, 0);
    arrastrar(-40, -30);

    const zona = component.zonaRecorte();
    // A la vista: lado / escala px de la foto original, desde -x/escala
    expect(zona.lado).toBeCloseTo(LADO / 0.75);
    expect(zona.x).toBeCloseTo(-component.x() / 0.75);
    expect(zona.y).toBeCloseTo(-component.y() / 0.75);
    expect(zona.x + zona.lado).toBeLessThanOrEqual(1200);
    expect(zona.y + zona.lado).toBeLessThanOrEqual(800);
  });

  it('should emit the square crop as a JPEG file', () => {
    const contexto = {
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      fillStyle: '',
      imageSmoothingQuality: '',
    };
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(contexto as never);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (cb) {
      cb(new Blob(['jpeg'], { type: 'image/jpeg' }));
    });
    const emitido = vi.fn();
    component.recortada.subscribe(emitido);

    component.guardar();

    const zona = component.zonaRecorte();
    const salida = Math.min(LADO_SALIDA, Math.round(zona.lado));
    expect(contexto.drawImage).toHaveBeenCalledWith(
      expect.any(HTMLImageElement),
      zona.x,
      zona.y,
      zona.lado,
      zona.lado,
      0,
      0,
      salida,
      salida,
    );
    const archivo = emitido.mock.calls[0][0] as File;
    expect([archivo.name, archivo.type]).toEqual(['foto-perfil.jpg', 'image/jpeg']);
  });

  it('should cancel with Escape or the close button, but not while saving', () => {
    const cancelado = vi.fn();
    component.cancelado.subscribe(cancelado);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    (html().querySelector('.rf-cerrar') as HTMLButtonElement).click();
    expect(cancelado).toHaveBeenCalledTimes(2);

    fixture.componentRef.setInput('guardando', true);
    component.cancelar();
    expect(cancelado).toHaveBeenCalledTimes(2);
  });

  it('should show an error if the image cannot be read', () => {
    component.alFallarImagen();
    fixture.detectChanges();
    expect(html().querySelector('.rf-error')?.textContent).toContain(
      'No fue posible leer la imagen',
    );
  });

  it('should release the image URL when closed', () => {
    fixture.destroy();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:foto');
  });
});
