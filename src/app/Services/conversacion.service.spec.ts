import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConversacionService } from './conversacion.service';
import { environment } from '../../environments/environment';

describe('ConversacionService', () => {
  let service: ConversacionService;
  let http: HttpTestingController;
  const api = `${environment.apiUrl}/api/v1/conversaciones`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ConversacionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('abrir', () => {
    service.abrir(8).subscribe((r) => expect(r.id_conversacion).toBe(3));
    const req = http.expectOne(api);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ id_publicacion: 8 });
    expect(req.request.withCredentials).toBe(true);
    req.flush({ id_conversacion: 3 });
  });

  it('listar', () => {
    service.listar().subscribe((l) => expect(l.length).toBe(1));
    const req = http.expectOne(api);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush([{ id_conversacion: 3 }]);
  });

  it('contarNoLeidos', () => {
    service.contarNoLeidos().subscribe((r) => expect(r.total).toBe(4));
    const req = http.expectOne(`${api}/no-leidos`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ total: 4 });
  });

  it('marcarLeidos', () => {
    service.marcarLeidos(3).subscribe((r) => expect(r.marcados).toBe(2));
    const req = http.expectOne(`${api}/3/leer`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ marcados: 2 });
  });

  it('obtener', () => {
    service.obtener(3).subscribe((c) => expect(c.mensajes.length).toBe(0));
    const req = http.expectOne(`${api}/3/mensajes`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ conversacion: { id_conversacion: 3 }, mensajes: [] });
  });

  it('finalizar', () => {
    service.finalizar(3).subscribe((r) => expect(r.estado).toBe('finalizada'));
    const req = http.expectOne(`${api}/3/finalizar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ id_conversacion: 3, estado: 'finalizada' });
  });

  it('calificar', () => {
    service
      .calificar(3, 5, 'Muy serio')
      .subscribe((r) => expect(r.calificacion_evaluado.total).toBe(1));
    const req = http.expectOne(`${api}/3/resena`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ calificacion: 5, comentario: 'Muy serio' });
    expect(req.request.withCredentials).toBe(true);
    req.flush({ resena: { id_resena: 1 }, calificacion_evaluado: { promedio: 5, total: 1 } });
  });

  it('calificacionDe', () => {
    service.calificacionDe(10).subscribe((c) => expect(c.promedio).toBe(4.5));
    const req = http.expectOne(`${environment.apiUrl}/api/v1/usuarios/10/calificacion`);
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(true);
    req.flush({ promedio: 4.5, total: 2 });
  });
});
