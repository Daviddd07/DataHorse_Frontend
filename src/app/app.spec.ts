import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { App, esRutaPublica } from './app';
import { NotificacionesService } from './Services/notificaciones.service';

@Component({ template: '' })
class PaginaVacia {}

describe('App', () => {
  let notificaciones: {
    iniciar: ReturnType<typeof vi.fn>;
    detener: ReturnType<typeof vi.fn>;
    avisos$: Subject<unknown>;
  };

  beforeEach(async () => {
    notificaciones = { iniciar: vi.fn(), detener: vi.fn(), avisos$: new Subject() };
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: 'login', component: PaginaVacia },
          { path: 'marketplace', component: PaginaVacia },
        ]),
        { provide: NotificacionesService, useValue: notificaciones },
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

    await router.navigateByUrl('/marketplace');
    expect(notificaciones.iniciar).toHaveBeenCalledTimes(1);

    await router.navigateByUrl('/login');
    expect(notificaciones.detener).toHaveBeenCalledTimes(1);
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
