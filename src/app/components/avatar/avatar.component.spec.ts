import { TestBed } from '@angular/core/testing';
import { AvatarComponent } from './avatar.component';
import { environment } from '../../../environments/environment';

describe('AvatarComponent', () => {
  const crear = (entradas: Record<string, unknown>) => {
    const fixture = TestBed.createComponent(AvatarComponent);
    Object.entries(entradas).forEach(([k, v]) => fixture.componentRef.setInput(k, v));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('should show the initial when there is no photo', () => {
    const avatar = crear({ nombre: ' david manuel ', tamano: 40 });
    expect(avatar.textContent?.trim()).toBe('D');
    expect(avatar.querySelector('img')).toBeNull();
    expect(avatar.style.width).toBe('40px');
    expect(avatar.getAttribute('aria-hidden')).toBe('true');
  });

  it('should show the profile photo when there is one', () => {
    const avatar = crear({ nombre: 'Ana', foto: '/uploads/perfiles/a.jpg' });
    expect((avatar.querySelector('img') as HTMLImageElement).src).toBe(
      `${environment.uploadsUrl}/uploads/perfiles/a.jpg`,
    );
    expect(avatar.classList).toContain('con-foto');
  });

  it('should show a question mark without a name', () => {
    expect(crear({ nombre: '' }).textContent?.trim()).toBe('?');
  });
});
