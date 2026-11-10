import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import {
  DOCUMENTO_MAX_BYTES,
  DocumentoService,
  errorDeArchivo,
  errorDeTitulo,
  tamanoLegible,
  tituloSugerido,
} from './documento.service';
import { environment } from '../../environments/environment';

const archivo = (nombre: string, bytes = 10) =>
  new File([new Uint8Array(bytes)], nombre, { type: 'application/octet-stream' });

describe('reglas de documentos', () => {
  it('acepta PDF e imágenes y rechaza otros formatos', () => {
    expect(errorDeArchivo(archivo('a.PDF'))).toBeNull();
    expect(errorDeArchivo(archivo('a.jpeg'))).toBeNull();
    expect(errorDeArchivo(archivo('a.webp'))).toBeNull();
    expect(errorDeArchivo(archivo('a.docx'))).toContain('Formato no permitido');
    expect(errorDeArchivo(archivo('sin-extension'))).toContain('Formato no permitido');
  });

  it('rechaza archivos vacíos o de más de 10 MB', () => {
    expect(errorDeArchivo(archivo('a.pdf', 0))).toContain('vacío');
    expect(errorDeArchivo(archivo('a.pdf', DOCUMENTO_MAX_BYTES + 1))).toContain('10 MB');
  });

  it('valida el largo del título', () => {
    expect(errorDeTitulo('Registro')).toBeNull();
    expect(errorDeTitulo(' x ')).toContain('entre 2 y 120');
    expect(errorDeTitulo('x'.repeat(121))).toContain('entre 2 y 120');
  });

  it('sugiere el título desde el nombre del archivo', () => {
    expect(tituloSugerido('registro_asde-2024.pdf')).toBe('registro asde 2024');
  });

  it('muestra el tamaño legible', () => {
    expect(tamanoLegible(100)).toBe('1 KB');
    expect(tamanoLegible(2048)).toBe('2 KB');
    expect(tamanoLegible(3.5 * 1024 * 1024)).toBe('3.5 MB');
  });
});

describe('DocumentoService', () => {
  let service: DocumentoService;
  let http: HttpTestingController;
  const api = `${environment.apiUrl}/api/v1/caballos/5/documentos`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DocumentoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listar', () => {
    service.listar(5).subscribe((r) => expect(r.es_propietario).toBe(true));
    const req = http.expectOne(api);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ es_propietario: true, documentos: [] });
  });

  it('subir envía cada archivo con su tipo y título', () => {
    const pdf = archivo('a.pdf');
    service.subir(5, [{ archivo: pdf, tipo: 'premio', titulo: ' Campeón ' }]).subscribe();
    const req = http.expectOne(api);
    expect(req.request.method).toBe('POST');
    const cuerpo = req.request.body as FormData;
    expect(cuerpo.getAll('files')).toEqual([pdf]);
    expect(cuerpo.getAll('tipos')).toEqual(['premio']);
    expect(cuerpo.getAll('titulos')).toEqual(['Campeón']);
    req.flush([]);
  });

  it('contenido y descargar piden un blob', () => {
    service.contenido(5, 3).subscribe();
    service.descargar(5, 3).subscribe();
    const ver = http.expectOne(`${api}/3/contenido`);
    const bajar = http.expectOne(`${api}/3/descarga`);
    expect(ver.request.responseType).toBe('blob');
    expect(bajar.request.responseType).toBe('blob');
    expect(ver.request.withCredentials).toBe(true);
    ver.flush(new Blob());
    bajar.flush(new Blob());
  });

  it('eliminar', () => {
    service.eliminar(5, 3).subscribe();
    const req = http.expectOne(`${api}/3`);
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });
});
