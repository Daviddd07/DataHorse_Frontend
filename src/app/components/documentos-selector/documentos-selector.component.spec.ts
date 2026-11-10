import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DocumentosSelectorComponent, errorDePendientes } from './documentos-selector.component';
import { DOCUMENTO_MAX_BYTES, DocumentoPendiente } from '../../Services/documento.service';

const archivo = (nombre: string, bytes = 10) => new File([new Uint8Array(bytes)], nombre);

describe('DocumentosSelectorComponent', () => {
  let fixture: ComponentFixture<DocumentosSelectorComponent>;
  let component: DocumentosSelectorComponent;

  const elegir = (...archivos: File[]) => {
    const entrada = { files: archivos, value: 'C:\\fake' } as unknown as HTMLInputElement;
    component.alElegir({ target: entrada } as unknown as Event);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DocumentosSelectorComponent] }).compileComponents();
    fixture = TestBed.createComponent(DocumentosSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('dice que es opcional y muestra el botón', () => {
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('(opcional)');
    expect(texto).toContain('Añadir documentos');
  });

  it('agrega archivos válidos con tipo pedigrí y título sugerido', () => {
    elegir(archivo('registro_asde.pdf'));
    expect(component.pendientes()).toEqual([
      expect.objectContaining({ tipo: 'pedigri', titulo: 'registro asde' }),
    ]);
    expect(fixture.nativeElement.querySelectorAll('.ds-item').length).toBe(1);
  });

  it('rechaza formatos no permitidos y archivos grandes con un aviso', () => {
    elegir(archivo('a.docx'), archivo('b.pdf', DOCUMENTO_MAX_BYTES + 1), archivo('c.png'));
    expect(component.pendientes().map((p) => p.archivo.name)).toEqual(['c.png']);
    expect(component.aviso()).toContain('a.docx');
    expect(component.aviso()).toContain('b.pdf');
  });

  it('respeta el máximo de 10 contando los ya subidos', () => {
    fixture.componentRef.setInput('yaSubidos', 9);
    elegir(archivo('a.pdf'), archivo('b.pdf'));
    expect(component.pendientes().length).toBe(1);
    expect(component.aviso()).toContain('máximo 10');
    expect(fixture.nativeElement.textContent).toContain('Llegaste al máximo');
  });

  it('cambia tipo y título, y quita un documento', () => {
    elegir(archivo('a.pdf'), archivo('b.pdf'));
    component.cambiarTipo(1, 'premio');
    component.cambiarTitulo(1, 'Campeón 2024');
    expect(component.pendientes()[1]).toEqual(expect.objectContaining({ tipo: 'premio', titulo: 'Campeón 2024' }));

    component.quitar(0);
    expect(component.pendientes().map((p) => p.archivo.name)).toEqual(['b.pdf']);
  });

  it('muestra el error del título cuando el usuario lo deja muy corto', () => {
    elegir(archivo('a.pdf'));
    component.cambiarTitulo(0, 'x');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.ds-error')?.textContent).toContain('entre 2 y 120');
  });

  it('errorDePendientes indica el archivo con el problema', () => {
    const lista: DocumentoPendiente[] = [
      { archivo: archivo('a.pdf'), tipo: 'pedigri', titulo: 'Bien' },
      { archivo: archivo('b.pdf'), tipo: 'otro', titulo: '' },
    ];
    expect(errorDePendientes(lista)).toContain('"b.pdf"');
    expect(errorDePendientes(lista.slice(0, 1))).toBeNull();
  });
});
