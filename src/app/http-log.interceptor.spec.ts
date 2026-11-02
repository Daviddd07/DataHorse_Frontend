import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { throwError } from 'rxjs';
import { httpLogInterceptor } from './http-log.interceptor';
import { LOGS_ENDPOINT, LogService } from './Services/log.service';

describe('httpLogInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  const log = { warn: vi.fn(), error: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpLogInterceptor])),
        provideHttpClientTesting(),
        { provide: LogService, useValue: log },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  const fallar = (url: string, status: number, error: object | null = null, metodo = 'GET') => {
    http.request(metodo, url).subscribe({ error: () => undefined });
    backend.expectOne(url).flush(error, { status, statusText: 'x' });
  };

  it('should not log successful requests', () => {
    http.get('/api/ok').subscribe();
    backend.expectOne('/api/ok').flush({});
    expect(log.warn).not.toHaveBeenCalled();
    expect(log.error).not.toHaveBeenCalled();
  });

  it('should log 5xx as error with context', () => {
    fallar('/api/caballos', 500, { detail: 'Fallo interno' }, 'POST');
    expect(log.error).toHaveBeenCalledWith(
      'HTTP 500 en POST /api/caballos',
      expect.objectContaining({
        metodo: 'POST',
        endpoint: '/api/caballos',
        status: 500,
        detalle: 'Fallo interno',
        duracion_ms: expect.any(Number),
      }),
    );
  });

  it('should log network errors (status 0) as error', () => {
    http.get('/api/caido').subscribe({ error: () => undefined });
    backend.expectOne('/api/caido').error(new ProgressEvent('error'));
    expect(log.error).toHaveBeenCalledWith(
      'HTTP 0 en GET /api/caido',
      expect.objectContaining({ status: 0, detalle: null }),
    );
  });

  it('should log 4xx as warn', () => {
    fallar('/api/caballos/1', 404);
    expect(log.warn).toHaveBeenCalledWith(
      'HTTP 404 en GET /api/caballos/1',
      expect.objectContaining({ status: 404 }),
    );
  });

  it('should ignore 401 responses', () => {
    fallar('/auth/me', 401);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('should never log the logs endpoint itself', () => {
    fallar(`http://localhost:8000${LOGS_ENDPOINT}`, 500, null, 'POST');
    expect(log.error).not.toHaveBeenCalled();
  });

  it('should ignore errors that are not HTTP errors', () => {
    const recibido = vi.fn();
    TestBed.runInInjectionContext(() =>
      httpLogInterceptor({ url: '/x', method: 'GET' } as never, () =>
        throwError(() => new Error('no http')),
      ),
    ).subscribe({ error: recibido });
    expect(recibido).toHaveBeenCalled();
    expect(log.warn).not.toHaveBeenCalled();
    expect(log.error).not.toHaveBeenCalled();
  });
});
