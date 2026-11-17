import { appConfig } from './app.config';
import { routes } from './app.routes';

describe('appConfig', () => {
  it('should register providers', () => {
    expect(appConfig.providers.length).toBeGreaterThan(0);
  });
});

describe('routes', () => {
  it('should redirect the empty path to the public marketplace', () => {
    const raiz = routes.find((r) => r.path === '');
    expect(raiz?.redirectTo).toBe('marketplace');
  });

  it('should let visitors see the marketplace and the publication detail', () => {
    for (const path of ['marketplace', 'publicaciones/:id']) {
      expect(routes.find((r) => r.path === path)?.canActivate).toBeUndefined();
    }
  });

  it('should protect private routes with the guard', () => {
    const privadas = ['publicaciones/nueva', 'mis-caballos', 'conversaciones', 'mi-cuenta'];
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
