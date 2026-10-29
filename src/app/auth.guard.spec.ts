import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';
import { authGuard } from './auth.guard';
import { AuthService } from './Services/auth.service';

describe('authGuard', () => {
  const auth = { me: vi.fn() };
  let router: Router;

  const ejecutar = () =>
    TestBed.runInInjectionContext(
      () =>
        authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as Observable<boolean>,
    );

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('should allow access when there is a session', async () => {
    auth.me.mockReturnValue(of({ id: 1, correo: 'a@a.com', nombre: 'Ana' }));
    expect(await firstValueFrom(ejecutar())).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should redirect to login when there is no session', async () => {
    auth.me.mockReturnValue(throwError(() => new Error('401')));
    expect(await firstValueFrom(ejecutar())).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
