import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { DocumentosCaballoComponent } from './documentos-caballo.component';
import { DocumentoCaballo, DocumentoService } from '../../Services/documento.service';

const DOC: DocumentoCaballo = {
  id_documento: 3,
  tipo: 'pedigri',
  tipo_etiqueta: 'Pedigrí / registro',
  titulo: 'Registro ASDE',
  content_type: 'application/pdf',
  es_pdf: true,
  tamano_bytes: 2048,
  estado_verificacion: 'sin_revisar',
  fecha_subida: '2026-11-10T09:30:00',
};

describe('DocumentosCaballoComponent', () => {
  let fixture: ComponentFixture<DocumentosCaballoComponent>;
  let component: DocumentosCaballoComponent;
  let servicio: Record<string, ReturnType<typeof vi.fn>>;

  const crear = async (esPropietario: boolean, gestionar: boolean) => {
    servicio['listar'].mockReturnValue(of({ es_propietario: esPropietario, documentos: [DOC] }));
    await TestBed.configureTestingModule({
      imports: [DocumentosCaballoComponent],
      providers: [{ provide: DocumentoService, useValue: servicio }],
    }).compileComponents();
    fixture = TestBed.createComponent(DocumentosCaballoComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('idCaballo', 5);
    fixture.componentRef.setInput('gestionar', gestionar);
    fixture.detectChanges();
  };

  const botones = (): string[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.dc-btn') as NodeListOf<HTMLElement>).map(
      (b) => b.textContent!.trim(),
    );

  beforeEach(() => {
    servicio = {
      listar: vi.fn(),
      subir: vi.fn().mockReturnValue(of([{ ...DOC, id_documento: 4 }])),
      eliminar: vi.fn().mockReturnValue(of({})),
      descargar: vi.fn().mockReturnValue(of(new Blob(['x']))),
      contenido: vi.fn().mockReturnValue(of(new Blob(['x']))),
    };
  });

  it('otro usuario solo puede ver: sin descargar ni eliminar', async () => {
    await crear(false, false);
    expect(servicio['listar']).toHaveBeenCalledWith(5);
    expect(fixture.nativeElement.textContent).toContain('Registro ASDE');
    expect(fixture.nativeElement.textContent).toContain('Aportados por el propietario');
    expect(botones()).toEqual(['Ver']);
    expect(fixture.nativeElement.querySelector('app-documentos-selector')).toBeNull();
  });

  it('el backend manda: aunque pida gestionar, si no es el dueño no gestiona', async () => {
    await crear(false, true);
    expect(botones()).toEqual(['Ver']);
  });

  it('el propietario puede descargar, eliminar y subir', async () => {
    await crear(true, true);
    expect(botones()).toEqual(['Ver', 'Descargar', 'Eliminar']);
    expect(fixture.nativeElement.querySelector('app-documentos-selector')).not.toBeNull();
  });

  it('Ver abre el visor', async () => {
    await crear(false, false);
    (fixture.nativeElement.querySelector('.dc-btn') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(component.abierto()).toEqual(DOC);
    expect(fixture.nativeElement.querySelector('app-visor-documento')).not.toBeNull();
  });

  it('sube los pendientes y los agrega a la lista', async () => {
    await crear(true, true);
    const pendiente = { archivo: new File(['x'], 'b.pdf'), tipo: 'premio' as const, titulo: 'Campeón' };
    component.pendientes.set([pendiente]);
    component.subir();
    expect(servicio['subir']).toHaveBeenCalledWith(5, [pendiente]);
    expect(component.documentos().map((d) => d.id_documento)).toEqual([3, 4]);
    expect(component.pendientes()).toEqual([]);
    expect(component.mensaje()).toContain('Se subieron 1');
  });

  it('no sube si un título es inválido', async () => {
    await crear(true, true);
    component.pendientes.set([{ archivo: new File(['x'], 'b.pdf'), tipo: 'otro', titulo: '' }]);
    component.subir();
    expect(servicio['subir']).not.toHaveBeenCalled();
    expect(component.mensajeEsError()).toBe(true);
  });

  it('muestra el detalle del backend si falla la subida', async () => {
    servicio['subir'].mockReturnValue(throwError(() => ({ error: { detail: 'Máximo 10' } })));
    await crear(true, true);
    component.pendientes.set([{ archivo: new File(['x'], 'b.pdf'), tipo: 'otro', titulo: 'Otro' }]);
    component.subir();
    expect(component.mensaje()).toBe('Máximo 10');
    expect(component.ocupado()).toBe(false);
  });

  it('elimina tras confirmar', async () => {
    await crear(true, true);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.eliminar(DOC);
    expect(servicio['eliminar']).toHaveBeenCalledWith(5, 3);
    expect(component.documentos()).toEqual([]);
  });

  it('no elimina si se cancela la confirmación', async () => {
    await crear(true, true);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    component.eliminar(DOC);
    expect(servicio['eliminar']).not.toHaveBeenCalled();
  });

  it('descarga el archivo con el título como nombre', async () => {
    await crear(true, true);
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    URL.createObjectURL = vi.fn().mockReturnValue('blob:x');
    URL.revokeObjectURL = vi.fn();
    component.descargar(DOC);
    expect(servicio['descargar']).toHaveBeenCalledWith(5, 3);
    expect(clic).toHaveBeenCalled();
    expect(component.ocupado()).toBe(false);
  });

  it('muestra un error si no puede cargar la lista', async () => {
    servicio['listar'] = vi.fn().mockReturnValue(throwError(() => ({ error: { detail: 'Caballo no encontrado' } })));
    await TestBed.configureTestingModule({
      imports: [DocumentosCaballoComponent],
      providers: [{ provide: DocumentoService, useValue: servicio }],
    }).compileComponents();
    fixture = TestBed.createComponent(DocumentosCaballoComponent);
    fixture.componentRef.setInput('idCaballo', 5);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Caballo no encontrado');
  });
});
