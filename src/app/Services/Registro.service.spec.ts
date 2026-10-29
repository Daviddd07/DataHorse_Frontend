import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RegistroService } from './Registro.service';
import { environment } from '../../environments/environment';

describe('RegistroService', () => {
  let service: RegistroService;
  let http: HttpTestingController;
  const api = `${environment.apiUrl}/auth`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RegistroService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('registrar should rename contrasena to password', () => {
    service
      .registrar({
        nombre: 'Ana',
        correo: 'a@a.com',
        contrasena: 'Secreto123',
        telefono: null,
        ubicacion: 'Bogotá',
      })
      .subscribe();
    const req = http.expectOne(`${api}/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      nombre: 'Ana',
      correo: 'a@a.com',
      password: 'Secreto123',
      telefono: null,
      ubicacion: 'Bogotá',
    });
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('verificarCorreo should post email and code', () => {
    service.verificarCorreo('a@a.com', '123456').subscribe();
    const req = http.expectOne(`${api}/verify-email`);
    expect(req.request.body).toEqual({ correo: 'a@a.com', codigo: '123456' });
    req.flush({ mensaje: 'ok' });
  });

  it('reenviarCodigo should post the email', () => {
    service.reenviarCodigo('a@a.com').subscribe();
    const req = http.expectOne(`${api}/resend-code`);
    expect(req.request.body).toEqual({ correo: 'a@a.com' });
    req.flush({ mensaje: 'ok' });
  });
});
