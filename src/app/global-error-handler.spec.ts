import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { GlobalErrorHandler } from './global-error-handler';
import { LogService } from './Services/log.service';

describe('GlobalErrorHandler', () => {
  let handler: GlobalErrorHandler;
  const log = { error: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [GlobalErrorHandler, { provide: LogService, useValue: log }],
    });
    handler = TestBed.inject(GlobalErrorHandler);
  });

  it('should log errors with their stack', () => {
    const error = new TypeError('x is undefined');
    handler.handleError(error);
    expect(console.error).toHaveBeenCalledWith(error);
    expect(log.error).toHaveBeenCalledWith('x is undefined', {
      tipo: 'TypeError',
      stack: error.stack,
    });
  });

  it('should wrap values that are not errors', () => {
    handler.handleError('algo raro');
    expect(log.error).toHaveBeenCalledWith('algo raro', expect.objectContaining({ tipo: 'Error' }));
  });

  it('should use a default message and a null stack when missing', () => {
    const error = new Error('');
    error.stack = undefined;
    handler.handleError(error);
    expect(log.error).toHaveBeenCalledWith('Error desconocido', { tipo: 'Error', stack: null });
  });

  it('should skip HTTP errors because the interceptor logs them', () => {
    handler.handleError(new HttpErrorResponse({ status: 500 }));
    expect(console.error).toHaveBeenCalled();
    expect(log.error).not.toHaveBeenCalled();
  });
});
