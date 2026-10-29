import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CaballoService, CaballoUpdatePayload, NuevaPublicacion } from './caballo.service';
import { environment } from '../../environments/environment';

describe('CaballoService', () => {
  let service: CaballoService;
  let http: HttpTestingController;
  const api = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CaballoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const esperar = (url: string, metodo: string, respuesta: object = {}) => {
    const req = http.expectOne(url);
    expect(req.request.method).toBe(metodo);
    expect(req.request.withCredentials).toBe(true);
    req.flush(respuesta);
    return req;
  };

  it('listarRazas', () => {
    service.listarRazas().subscribe((r) => expect(r.length).toBe(1));
    esperar(`${api}/api/v1/razas`, 'GET', [{ id_raza: 1, nombre: 'Criollo' }]);
  });

  it('obtenerCaballo', () => {
    service.obtenerCaballo(5).subscribe();
    esperar(`${api}/api/v1/caballos/5`, 'GET');
  });

  it('actualizarCaballo', () => {
    const datos = { nombre: 'Rayo' } as CaballoUpdatePayload;
    service.actualizarCaballo(5, datos).subscribe();
    const req = esperar(`${api}/api/v1/caballos/5`, 'PUT');
    expect(req.request.body).toEqual(datos);
  });

  it('eliminarCaballo', () => {
    service.eliminarCaballo(5).subscribe();
    esperar(`${api}/api/v1/caballos/5`, 'DELETE');
  });

  it('eliminarFoto', () => {
    service.eliminarFoto(5, 9).subscribe();
    esperar(`${api}/api/v1/caballos/5/fotos/9`, 'DELETE');
  });

  it('crear', () => {
    const datos = { nombre: 'Rayo', sexo: 'Macho' } as NuevaPublicacion;
    service.crear(datos).subscribe();
    const req = esperar(`${api}/api/v1/caballos`, 'POST');
    expect(req.request.body).toEqual(datos);
  });

  it('listarPublicaciones', () => {
    service.listarPublicaciones().subscribe();
    esperar(`${api}/publicaciones`, 'GET', []);
  });

  it('obtenerPublicacion', () => {
    service.obtenerPublicacion(3).subscribe();
    esperar(`${api}/publicaciones/3`, 'GET');
  });

  it('agregarFavorito', () => {
    service.agregarFavorito(5).subscribe();
    esperar(`${api}/api/v1/caballos/5/favorito`, 'POST');
  });

  it('quitarFavorito', () => {
    service.quitarFavorito(5).subscribe();
    esperar(`${api}/api/v1/caballos/5/favorito`, 'DELETE');
  });

  it('subirFotos should send every file in a FormData', () => {
    const a = new File(['a'], 'a.png');
    const b = new File(['b'], 'b.png');
    service.subirFotos(5, [a, b]).subscribe();
    const req = esperar(`${api}/api/v1/caballos/5/fotos`, 'POST', []);
    const body = req.request.body as FormData;
    expect(body.getAll('files').length).toBe(2);
  });

  it('listarMisCaballos', () => {
    service.listarMisCaballos().subscribe();
    esperar(`${api}/api/v1/caballos/mios`, 'GET', []);
  });
});
