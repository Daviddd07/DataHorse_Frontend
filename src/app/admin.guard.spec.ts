import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';
import { adminGuard } from './admin.guard';
import { AuthService } from './Services/auth.service';

describe('adminGuard', () => {
  const auth = { me: vi.fn() };
  let router: Router;

  const ejecutar = () =>
    TestBed.runInInjectionContext(
      () =>
        adminGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot) as Observable<boolean>,
    );

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('should allow access to an administrator', async () => {
    auth.me.mockReturnValue(of({ id: 1, correo: 'a@a.com', nombre: 'Ana', es_admin: true }));
    expect(await firstValueFrom(ejecutar())).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should send a normal user to the marketplace', async () => {
    auth.me.mockReturnValue(of({ id: 2, correo: 'b@b.com', nombre: 'Beto', es_admin: false }));
    expect(await firstValueFrom(ejecutar())).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/marketplace']);
  });

  it('should redirect to login when there is no session', async () => {
    auth.me.mockReturnValue(throwError(() => new Error('401')));
    expect(await firstValueFrom(ejecutar())).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
