import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  const api = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('login should post credentials', () => {
    service.login('a@a.com', 'Secreto123').subscribe((r) => expect(r.mensaje).toBe('ok'));
    const req = http.expectOne(`${api}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ correo: 'a@a.com', password: 'Secreto123' });
    expect(req.request.withCredentials).toBe(true);
    req.flush({ mensaje: 'ok' });
  });

  it('google should post the credential', () => {
    service.google('token').subscribe();
    const req = http.expectOne(`${api}/auth/google`);
    expect(req.request.body).toEqual({ credential: 'token' });
    req.flush({ mensaje: 'ok', usuario: { id: 1, correo: 'a@a.com', nombre: 'A' } });
  });

  it('forgotPassword should post the email', () => {
    service.forgotPassword('a@a.com').subscribe();
    const req = http.expectOne(`${api}/auth/forgot-password`);
    expect(req.request.body).toEqual({ correo: 'a@a.com' });
    req.flush({ mensaje: 'ok' });
  });

  it('resetPassword should post code and new password', () => {
    service.resetPassword('a@a.com', '123456', 'Nueva1234').subscribe();
    const req = http.expectOne(`${api}/auth/reset-password`);
    expect(req.request.body).toEqual({
      correo: 'a@a.com',
      codigo: '123456',
      nueva_password: 'Nueva1234',
    });
    req.flush({ mensaje: 'ok' });
  });

  it('me should get the current user', () => {
    service.me().subscribe((u) => expect(u.nombre).toBe('Ana'));
    const req = http.expectOne(`${api}/auth/me`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 1, correo: 'a@a.com', nombre: 'Ana' });
  });

  it('logout should post an empty body', () => {
    service.logout().subscribe();
    const req = http.expectOne(`${api}/auth/logout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ mensaje: 'ok' });
  });
});
