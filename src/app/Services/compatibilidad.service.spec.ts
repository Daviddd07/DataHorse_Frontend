import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CompatibilidadService } from './compatibilidad.service';
import { environment } from '../../environments/environment';

describe('CompatibilidadService', () => {
  let service: CompatibilidadService;
  let http: HttpTestingController;
  const api = `${environment.apiUrl}/api/v1/compatibilidad`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CompatibilidadService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('obtenerCupo', () => {
    service.obtenerCupo().subscribe((c) => expect(c.restantes).toBe(4));
    const req = http.expectOne(`${api}/cupo`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ limite: 5, usadas: 1, restantes: 4 });
  });

  it('listarMisResultados', () => {
    service.listarMisResultados().subscribe((l) => expect(l.length).toBe(1));
    const req = http.expectOne(`${api}/mis-resultados`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush([{ id_solicitud: 1 }]);
  });

  it('obtenerResultado', () => {
    service.obtenerResultado(7).subscribe((e) => expect(e.id_solicitud).toBe(7));
    const req = http.expectOne(`${api}/resultados/7`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ id_solicitud: 7 });
  });

  it('evaluar', () => {
    service.evaluar(10, 8).subscribe((e) => expect(e.desde_cache).toBe(false));
    const req = http.expectOne(api);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ id_caballo: 10, id_yegua: 8 });
    expect(req.request.withCredentials).toBe(true);
    req.flush({ desde_cache: false });
  });
});
