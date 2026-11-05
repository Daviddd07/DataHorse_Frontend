import { Component, OnDestroy, inject, signal } from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Router } from '@angular/router';

import { AvisoMensaje, NotificacionesService } from '../../Services/notificaciones.service';

const DURACION_MS = 6000;

/** Aviso emergente "Nuevo mensaje de X" que aparece en cualquier pantalla. */
@Component({
  selector: 'app-aviso-mensaje',
  standalone: true,
  templateUrl: './aviso-mensaje.component.html',
  styleUrl: './aviso-mensaje.component.css',
})
export class AvisoMensajeComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly notificaciones = inject(NotificacionesService);

  aviso = signal<AvisoMensaje | null>(null);

  private temporizador: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.notificaciones.avisos$.pipe(takeUntilDestroyed()).subscribe((aviso) => this.mostrar(aviso));
  }

  abrir(): void {
    const aviso = this.aviso();
    if (!aviso) {
      return;
    }
    this.cerrar();
    void this.router.navigate(['/conversaciones', aviso.mensaje.id_conversacion]);
  }

  cerrar(): void {
    this.limpiarTemporizador();
    this.aviso.set(null);
  }

  ngOnDestroy(): void {
    this.limpiarTemporizador();
  }

  private mostrar(aviso: AvisoMensaje): void {
    this.limpiarTemporizador();
    this.aviso.set(aviso);
    this.temporizador = setTimeout(() => this.cerrar(), DURACION_MS);
  }

  private limpiarTemporizador(): void {
    if (this.temporizador !== null) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
  }
}
