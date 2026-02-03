import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

@Component({
  selector: 'sf-modal',
  imports: [],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  @Input() open = false;
  @Input() title = '';
  @Input() subtitle?: string;
  @Input() closeOnBackdrop = true;
  @Input() closeOnEsc = true;
  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: Event): void {
    if (!(event instanceof KeyboardEvent)) {
      return;
    }
    if (!this.open || !this.closeOnEsc) {
      return;
    }
    event.preventDefault();
    this.closed.emit();
  }

  onBackdropClick(): void {
    if (!this.closeOnBackdrop) {
      return;
    }
    this.closed.emit();
  }
}
