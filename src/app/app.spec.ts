import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { App, esRutaAbierta, esRutaPublica } from './app';
import { AuthService } from './Services/auth.service';
import { NotificacionesService } from './Services/notificaciones.service';

@Component({ template: '' })
class PaginaVacia {}

describe('App', () => {
  let notificaciones: {
    iniciar: ReturnType<typeof vi.fn>;
    detener: ReturnType<typeof vi.fn>;
    avisos$: Subject<unknown>;
  };
  const auth = { me: vi.fn() };

  beforeEach(async () => {
    notificaciones = { iniciar: vi.fn(), detener: vi.fn(), avisos$: new Subject() };
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: 'login', component: PaginaVacia },
          { path: 'marketplace', component: PaginaVacia },
          { path: 'mis-caballos', component: PaginaVacia },
        ]),
        { provide: NotificacionesService, useValue: notificaciones },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the router outlet and the message notice', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
    expect(compiled.querySelector('app-aviso-mensaje')).not.toBeNull();
  });

  it('should listen for messages only on the pages with a session', async () => {
    TestBed.createComponent(App);
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/mis-caballos');
    expect(notificaciones.iniciar).toHaveBeenCalledTimes(1);

    await router.navigateByUrl('/login');
    expect(notificaciones.detener).toHaveBeenCalledTimes(1);
  });

  it('should listen for messages on the public marketplace only with a session', async () => {
    TestBed.createComponent(App);
    const router = TestBed.inject(Router);

    auth.me.mockReturnValue(of({ id: 1 }));
    await router.navigateByUrl('/marketplace');
    expect(notificaciones.iniciar).toHaveBeenCalledTimes(1);

    auth.me.mockReturnValue(throwError(() => new Error('401')));
    await router.navigateByUrl('/mis-caballos');
    await router.navigateByUrl('/marketplace');
    expect(notificaciones.detener).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['/marketplace', true],
    ['/marketplace?x=1', true],
    ['/publicaciones/12', true],
    ['/publicaciones/nueva', false],
    ['/mis-caballos', false],
  ])('esRutaAbierta(%s) = %s', (url, esperado) => {
    expect(esRutaAbierta(url)).toBe(esperado);
  });

  it.each([
    ['/', true],
    ['/login', true],
    ['/login?x=1', true],
    ['/registrar', true],
    ['/verificar-correo', true],
    ['/recuperar-password/paso', true],
    ['/marketplace', false],
    ['/conversaciones/3', false],
    ['/loginx', false],
  ])('esRutaPublica(%s) = %s', (url, esperado) => {
    expect(esRutaPublica(url)).toBe(esperado);
  });
});
