import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOGS_ENDPOINT, LogLote, LogService } from './log.service';
import { environment } from '../../environments/environment';

describe('LogService', () => {
  let service: LogService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}${LOGS_ENDPOINT}`;
  const original = { ...environment };

  const crear = () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LogService);
    http = TestBed.inject(HttpTestingController);
  };

  const ocultarPagina = (estado: DocumentVisibilityState = 'hidden') => {
    Object.defineProperty(document, 'visibilityState', { value: estado, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    http?.verify();
    TestBed.resetTestingModule();
    Object.assign(environment, original);
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('with the development config', () => {
    beforeEach(() => crear());

    it('should batch non-error logs and send them after 5 seconds', () => {
      service.debug('depurando');
      service.info('hola', { a: 1 });
      service.warn('cuidado');
      http.expectNone(url);
      expect(console.log).toHaveBeenCalledWith('[DEBUG] depurando', '');
      expect(console.info).toHaveBeenCalledWith('[INFO] hola', { a: 1 });

      vi.advanceTimersByTime(5000);
      const req = http.expectOne(url);
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBe(true);

      const { logs } = req.request.body as LogLote;
      expect(logs.map((l) => l.nivel)).toEqual(['debug', 'info', 'warn']);
      expect(logs[1]).toEqual(
        expect.objectContaining({
          mensaje: 'hola',
          contexto: { a: 1 },
          url: location.pathname,
          user_agent: navigator.userAgent,
          sesion_id: service.sesionId,
        }),
      );
      expect(new Date(logs[0].fecha).toString()).not.toBe('Invalid Date');
      req.flush({});
    });

    it('should send errors immediately together with the pending logs', () => {
      service.info('antes');
      service.error('fallo');
      const req = http.expectOne(url);
      expect((req.request.body as LogLote).logs.map((l) => l.mensaje)).toEqual(['antes', 'fallo']);
      req.flush({});

      vi.advanceTimersByTime(5000);
      http.expectNone(url);
    });

    it('should send when the batch reaches 10 logs', () => {
      for (let i = 0; i < 10; i++) service.info(`log ${i}`);
      const req = http.expectOne(url);
      expect((req.request.body as LogLote).logs.length).toBe(10);
      req.flush({});
    });

    it('flush should do nothing with an empty queue', () => {
      service.flush();
      http.expectNone(url);
    });

    it('should truncate long messages and contexts', () => {
      service.error('x'.repeat(2000), { texto: 'y'.repeat(5000) });
      const [log] = (http.expectOne(url).request.body as LogLote).logs;
      expect(log.mensaje.length).toBe(1000);
      expect(log.contexto?.['truncado']).toBe(true);
      expect((log.contexto?.['resumen'] as string).length).toBe(4000);
    });

    it('should handle contexts that cannot be serialized', () => {
      const circular: Record<string, unknown> = {};
      circular['yo'] = circular;
      service.error('circular', circular);
      const [log] = (http.expectOne(url).request.body as LogLote).logs;
      expect(log.contexto).toEqual({ error: 'Contexto no serializable' });
    });

    it('should warn in the console if the backend fails', () => {
      service.error('fallo');
      http.expectOne(url).flush(null, { status: 500, statusText: 'Error' });
      expect(console.warn).toHaveBeenCalledWith('No se pudieron enviar los logs al backend.');
    });

    it('should send pending logs with keepalive when the page is hidden', () => {
      const fetchMock = vi.fn().mockResolvedValue({});
      vi.stubGlobal('fetch', fetchMock);

      ocultarPagina('visible');
      service.info('saliendo');
      ocultarPagina('visible');
      expect(fetchMock).not.toHaveBeenCalled();

      ocultarPagina('hidden');
      expect(fetchMock).toHaveBeenCalledWith(
        url,
        expect.objectContaining({ method: 'POST', credentials: 'include', keepalive: true }),
      );
      const body = JSON.parse(fetchMock.mock.calls[0][1].body) as LogLote;
      expect(body.logs[0].mensaje).toBe('saliendo');

      vi.advanceTimersByTime(5000);
      http.expectNone(url);
    });

    it('should ignore fetch errors and empty queues when hidden', async () => {
      const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
      vi.stubGlobal('fetch', fetchMock);

      ocultarPagina('hidden');
      expect(fetchMock).not.toHaveBeenCalled();

      service.info('saliendo');
      window.dispatchEvent(new Event('pagehide'));
      await vi.runAllTimersAsync();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('ngOnDestroy should remove listeners and flush', () => {
      const fetchMock = vi.fn().mockResolvedValue({});
      vi.stubGlobal('fetch', fetchMock);
      service.info('ultimo');
      service.ngOnDestroy();
      http.expectOne(url).flush({});

      service.info('otro');
      ocultarPagina('hidden');
      expect(fetchMock).not.toHaveBeenCalled();
      service.flush();
      http.expectOne(url).flush({});
    });
  });

  describe('with other configs', () => {
    it('should skip logs below the minimum level', () => {
      environment.logLevel = 'warn';
      crear();
      service.debug('no');
      service.info('no');
      vi.advanceTimersByTime(5000);
      http.expectNone(url);

      service.warn('si');
      vi.advanceTimersByTime(5000);
      expect((http.expectOne(url).request.body as LogLote).logs.length).toBe(1);
    });

    it('should default to info with an unknown level', () => {
      environment.logLevel = 'otro';
      crear();
      service.debug('no');
      vi.advanceTimersByTime(5000);
      http.expectNone(url);
      service.info('si');
      vi.advanceTimersByTime(5000);
      http.expectOne(url).flush({});
    });

    it('should not write to the console in production', () => {
      environment.production = true;
      crear();
      service.error('fallo');
      http.expectOne(url).flush(null, { status: 500, statusText: 'Error' });
      expect(console.error).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
    });
  });
});
