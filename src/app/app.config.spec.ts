import { appConfig } from './app.config';
import { routes } from './app.routes';

describe('appConfig', () => {
  it('should register providers', () => {
    expect(appConfig.providers.length).toBeGreaterThan(0);
  });
});

describe('routes', () => {
  it('should redirect the empty path to login', () => {
    const raiz = routes.find((r) => r.path === '');
    expect(raiz?.redirectTo).toBe('login');
  });

  it('should protect private routes with the guard', () => {
    const privadas = ['marketplace', 'publicaciones/nueva', 'publicaciones/:id', 'mis-caballos'];
    for (const path of privadas) {
      expect(routes.find((r) => r.path === path)?.canActivate?.length).toBe(1);
    }
  });

  it('should lazy load every component', async () => {
    const perezosas = routes.filter((r) => r.loadComponent);
    const componentes = await Promise.all(perezosas.map((r) => r.loadComponent!()));
    expect(componentes.every((c) => !!c)).toBe(true);
  });
});
