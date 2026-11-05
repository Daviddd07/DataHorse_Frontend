import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CuentaService, urlDeSubida } from './cuenta.service';
import { environment } from '../../environments/environment';

describe('CuentaService', () => {
  let service: CuentaService;
  let http: HttpTestingController;
  const api = `${environment.apiUrl}/api/v1`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CuentaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('obtenerPerfil', () => {
    service.obtenerPerfil().subscribe((p) => expect(p.nombre).toBe('Ana'));
    const req = http.expectOne(`${api}/cuenta/perfil`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ nombre: 'Ana' });
  });

  it('actualizarPerfil sends only the editable fields', () => {
    const cambios = { nombre: 'Ana', telefono: null, ciudad: 'Chía', departamento: 'Cundinamarca' };
    service.actualizarPerfil(cambios).subscribe((p) => expect(p.ciudad).toBe('Chía'));
    const req = http.expectOne(`${api}/cuenta/perfil`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(cambios);
    expect(req.request.withCredentials).toBe(true);
    req.flush({ ciudad: 'Chía' });
  });

  it('subirFoto sends the file as form data', () => {
    const foto = new File(['x'], 'yo.png', { type: 'image/png' });
    service.subirFoto(foto).subscribe((p) => expect(p.foto_perfil).toBe('/uploads/perfiles/a.jpg'));
    const req = http.expectOne(`${api}/cuenta/foto`);
    expect(req.request.method).toBe('PUT');
    const enviado = (req.request.body as FormData).get('foto') as File;
    expect([enviado.name, enviado.type]).toEqual(['yo.png', 'image/png']);
    expect(req.request.withCredentials).toBe(true);
    req.flush({ foto_perfil: '/uploads/perfiles/a.jpg' });
  });

  it('quitarFoto', () => {
    service.quitarFoto().subscribe((p) => expect(p.foto_perfil).toBeNull());
    const req = http.expectOne(`${api}/cuenta/foto`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ foto_perfil: null });
  });

  it('urlDeSubida builds the full URL or null', () => {
    expect(urlDeSubida('/uploads/perfiles/a.jpg')).toBe(
      `${environment.uploadsUrl}/uploads/perfiles/a.jpg`,
    );
    expect(urlDeSubida(null)).toBeNull();
  });

  it('sugerirDepartamentos returns the names', () => {
    service.sugerirDepartamentos().subscribe((d) => expect(d).toEqual(['Antioquia', 'Meta']));
    http
      .expectOne(`${api}/caballos/ubicaciones/departamentos`)
      .flush([{ departamento: 'Antioquia' }, { departamento: 'Meta' }]);
  });

  it('sugerirCiudades filters by department', () => {
    service.sugerirCiudades('Cundinamarca').subscribe((c) => expect(c).toEqual(['Chía']));
    const req = http.expectOne((r) => r.url === `${api}/caballos/ubicaciones/ciudades`);
    expect(req.request.params.get('departamento')).toBe('Cundinamarca');
    req.flush([{ ciudad: 'Chía' }]);
  });
});
