import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { VisorDocumentoComponent } from './visor-documento.component';
import { DocumentoCaballo, DocumentoService } from '../../Services/documento.service';

const IMAGEN: DocumentoCaballo = {
  id_documento: 3,
  tipo: 'premio',
  tipo_etiqueta: 'Premio',
  titulo: 'Campeón 2024',
  content_type: 'image/png',
  es_pdf: false,
  tamano_bytes: 2048,
  estado_verificacion: 'sin_revisar',
  fecha_subida: null,
};

describe('VisorDocumentoComponent', () => {
  let fixture: ComponentFixture<VisorDocumentoComponent>;
  let servicio: { contenido: ReturnType<typeof vi.fn> };

  const crear = async () => {
    await TestBed.configureTestingModule({
      imports: [VisorDocumentoComponent],
      providers: [{ provide: DocumentoService, useValue: servicio }],
    }).compileComponents();
    fixture = TestBed.createComponent(VisorDocumentoComponent);
    fixture.componentRef.setInput('idCaballo', 5);
    fixture.componentRef.setInput('documento', IMAGEN);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(() => {
    servicio = { contenido: vi.fn().mockReturnValue(of(new Blob(['x'], { type: 'image/png' }))) };
    URL.createObjectURL = vi.fn().mockReturnValue('blob:imagen');
    URL.revokeObjectURL = vi.fn();
  });

  it('muestra la imagen sin ofrecer descarga', async () => {
    await crear();
    expect(servicio.contenido).toHaveBeenCalledWith(5, 3);
    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('blob:imagen');
    expect(img.getAttribute('draggable')).toBe('false');
    expect(fixture.nativeElement.textContent).toContain('Solo visualización');
    expect(fixture.nativeElement.querySelector('a[download]')).toBeNull();
  });

  it('bloquea el menú contextual sobre el documento', async () => {
    await crear();
    const evento = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    fixture.nativeElement.querySelector('.vd-cuerpo').dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(true);
  });

  it('muestra un error si no se puede abrir', async () => {
    servicio.contenido.mockReturnValue(throwError(() => new Error('x')));
    await crear();
    expect(fixture.nativeElement.textContent).toContain('No se pudo abrir el documento');
  });

  it('se cierra con el botón, el fondo o Escape, y libera la imagen', async () => {
    await crear();
    const cerrar = vi.fn();
    fixture.componentInstance.cerrar.subscribe(cerrar);

    fixture.nativeElement.querySelector('.vd-cerrar').click();
    fixture.nativeElement.querySelector('.vd-fondo').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(cerrar).toHaveBeenCalledTimes(3);

    fixture.destroy();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:imagen');
  });
});
