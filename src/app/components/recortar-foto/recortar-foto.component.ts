import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

export const ZOOM_MAXIMO = 4;
export const LADO_SALIDA = 1024; // px del cuadrado que se sube (el servidor lo deja en 512)
const PASO_TECLADO = 10; // px que se mueve la foto con las flechas
const PASO_ZOOM = 0.1;

/**
 * Ventana para encuadrar la foto de perfil: se arrastra la imagen y se hace zoom dentro de un
 * cuadrado con la máscara del círculo. "Guardar foto" entrega el recorte cuadrado como JPEG.
 */
@Component({
  selector: 'app-recortar-foto',
  standalone: true,
  templateUrl: './recortar-foto.component.html',
  styleUrls: ['./recortar-foto.component.css'],
})
export class RecortarFotoComponent implements AfterViewInit {
  archivo = input.required<File>();
  guardando = input(false);

  recortada = output<File>();
  cancelado = output<void>();

  @ViewChild('marco') private marco?: ElementRef<HTMLElement>;
  @ViewChild('zoomControl') private zoomControl?: ElementRef<HTMLInputElement>;
  @ViewChild('imagen') private imagen?: ElementRef<HTMLImageElement>;

  readonly zoomMaximo = ZOOM_MAXIMO;

  url = signal<string | null>(null);
  error = signal('');

  // Tamaño natural de la imagen y lado del marco cuadrado (px en pantalla)
  private ancho = signal(0);
  private alto = signal(0);
  lado = signal(0);

  zoom = signal(1);
  x = signal(0); // esquina superior izquierda de la imagen respecto al marco
  y = signal(0);

  private arrastre: {
    idPuntero: number;
    inicioX: number;
    inicioY: number;
    x: number;
    y: number;
  } | null = null;

  // Escala con la que la imagen cubre justo el cuadrado (zoom 1)
  private escalaBase = computed(() =>
    this.ancho() && this.alto()
      ? Math.max(this.lado() / this.ancho(), this.lado() / this.alto())
      : 1,
  );
  escala = computed(() => this.escalaBase() * this.zoom());

  lista = computed(() => this.ancho() > 0 && this.lado() > 0);

  estiloImagen = computed(() => ({
    width: `${this.ancho() * this.escala()}px`,
    height: `${this.alto() * this.escala()}px`,
    transform: `translate(${this.x()}px, ${this.y()}px)`,
  }));

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      const url = this.url();
      if (url) URL.revokeObjectURL(url);
    });
  }

  ngAfterViewInit(): void {
    this.url.set(URL.createObjectURL(this.archivo()));
    this.medirMarco();
    setTimeout(() => this.zoomControl?.nativeElement.focus());
  }

  // ======================================================
  // CARGA Y MEDIDAS
  // ======================================================

  alCargarImagen(evento: Event): void {
    const imagen = evento.target as HTMLImageElement;
    this.iniciar(imagen.naturalWidth, imagen.naturalHeight);
  }

  alFallarImagen(): void {
    this.error.set('No fue posible leer la imagen. Prueba con otra.');
  }

  // Centra la imagen cubriendo el cuadrado
  iniciar(ancho: number, alto: number): void {
    this.ancho.set(ancho);
    this.alto.set(alto);
    this.zoom.set(1);
    this.centrar();
  }

  @HostListener('window:resize')
  medirMarco(): void {
    const lado = this.marco?.nativeElement.getBoundingClientRect().width ?? 0;
    if (!lado || lado === this.lado()) return;

    // Conserva el encuadre al cambiar el tamaño de la ventana
    const proporcion = this.lado() ? lado / this.lado() : 1;
    this.lado.set(lado);
    if (this.ancho()) this.mover(this.x() * proporcion, this.y() * proporcion);
  }

  private centrar(): void {
    const lado = this.lado();
    this.mover((lado - this.ancho() * this.escala()) / 2, (lado - this.alto() * this.escala()) / 2);
  }

  // La imagen nunca deja huecos dentro del cuadrado
  private mover(x: number, y: number): void {
    const lado = this.lado();
    const minX = lado - this.ancho() * this.escala();
    const minY = lado - this.alto() * this.escala();
    this.x.set(Math.min(0, Math.max(minX, x)));
    this.y.set(Math.min(0, Math.max(minY, y)));
  }

  // ======================================================
  // ZOOM (se mantiene fijo el punto del centro del cuadrado)
  // ======================================================

  cambiarZoom(nuevo: number): void {
    const zoom = Math.min(ZOOM_MAXIMO, Math.max(1, nuevo));
    const centro = this.lado() / 2;
    const puntoX = (centro - this.x()) / this.escala();
    const puntoY = (centro - this.y()) / this.escala();

    this.zoom.set(zoom);
    this.mover(centro - puntoX * this.escala(), centro - puntoY * this.escala());
  }

  alMoverZoom(evento: Event): void {
    this.cambiarZoom(Number((evento.target as HTMLInputElement).value));
  }

  acercar(): void {
    this.cambiarZoom(this.zoom() + PASO_ZOOM * 2);
  }

  alejar(): void {
    this.cambiarZoom(this.zoom() - PASO_ZOOM * 2);
  }

  alRuedaMouse(evento: WheelEvent): void {
    evento.preventDefault();
    this.cambiarZoom(this.zoom() + (evento.deltaY < 0 ? PASO_ZOOM : -PASO_ZOOM));
  }

  // ======================================================
  // ARRASTRAR (mouse, dedo o lápiz)
  // ======================================================

  alPresionar(evento: PointerEvent): void {
    if (!this.lista()) return;
    (evento.currentTarget as HTMLElement).setPointerCapture?.(evento.pointerId);
    this.arrastre = {
      idPuntero: evento.pointerId,
      inicioX: evento.clientX,
      inicioY: evento.clientY,
      x: this.x(),
      y: this.y(),
    };
  }

  alArrastrar(evento: PointerEvent): void {
    if (!this.arrastre || evento.pointerId !== this.arrastre.idPuntero) return;
    this.mover(
      this.arrastre.x + evento.clientX - this.arrastre.inicioX,
      this.arrastre.y + evento.clientY - this.arrastre.inicioY,
    );
  }

  alSoltar(): void {
    this.arrastre = null;
  }

  arrastrando(): boolean {
    return this.arrastre !== null;
  }

  // Flechas para mover la foto sin mouse
  alTeclaMarco(evento: KeyboardEvent): void {
    const pasos: Record<string, [number, number]> = {
      ArrowLeft: [PASO_TECLADO, 0],
      ArrowRight: [-PASO_TECLADO, 0],
      ArrowUp: [0, PASO_TECLADO],
      ArrowDown: [0, -PASO_TECLADO],
    };
    const paso = pasos[evento.key];
    if (!paso) return;
    evento.preventDefault();
    this.mover(this.x() + paso[0], this.y() + paso[1]);
  }

  @HostListener('document:keydown.escape')
  cancelar(): void {
    if (!this.guardando()) this.cancelado.emit();
  }

  // ======================================================
  // RECORTE
  // ======================================================

  // Parte de la imagen original (en px naturales) que se ve dentro del cuadrado
  zonaRecorte(): { x: number; y: number; lado: number } {
    const escala = this.escala();
    return { x: -this.x() / escala, y: -this.y() / escala, lado: this.lado() / escala };
  }

  guardar(): void {
    const imagen = this.imagen?.nativeElement;
    if (!imagen || !this.lista() || this.guardando()) return;

    const zona = this.zonaRecorte();
    const salida = Math.round(Math.min(LADO_SALIDA, zona.lado));
    const lienzo = document.createElement('canvas');
    lienzo.width = salida;
    lienzo.height = salida;

    const contexto = lienzo.getContext('2d');
    if (!contexto) {
      this.error.set('Tu navegador no permite recortar la imagen.');
      return;
    }
    contexto.fillStyle = '#ffffff'; // fondo blanco si la imagen tiene transparencias
    contexto.fillRect(0, 0, salida, salida);
    contexto.imageSmoothingQuality = 'high';
    contexto.drawImage(imagen, zona.x, zona.y, zona.lado, zona.lado, 0, 0, salida, salida);

    lienzo.toBlob(
      (blob) => {
        if (!blob) {
          this.error.set('No fue posible recortar la imagen.');
          return;
        }
        this.recortada.emit(new File([blob], 'foto-perfil.jpg', { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92,
    );
  }
}
