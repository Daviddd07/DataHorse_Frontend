import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminService } from './admin.service';
import { environment } from '../../environments/environment';

describe('AdminService', () => {
  let service: AdminService;
  let http: HttpTestingController;
  const api = `${environment.apiUrl}/api/v1/admin`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const esperar = (url: string, respuesta: object) => {
    const req = http.expectOne(url);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush(respuesta);
  };

  it('obtenerResumen', () => {
    service.obtenerResumen().subscribe((r) => expect(r.publicaciones.total).toBe(5));
    esperar(`${api}/resumen`, { publicaciones: { total: 5, activas: 4 } });
  });

  it('listarUsuarios', () => {
    service.listarUsuarios().subscribe((u) => expect(u.length).toBe(1));
    esperar(`${api}/usuarios`, [{ id_usuario: 7 }]);
  });
});
