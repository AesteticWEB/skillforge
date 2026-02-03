import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NotificationsStore, NotificationType } from '@/features/notifications';

const TYPE_CLASSES: Record<NotificationType, string> = {
  success: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100',
  info: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-100',
  error: 'border-rose-500/40 bg-rose-500/10 text-rose-100',
};

@Component({
  selector: 'app-toast-host',
  imports: [NgClass],
  templateUrl: './toast-host.widget.html',
  styleUrl: './toast-host.widget.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastHostWidget {
  private readonly notifications = inject(NotificationsStore);
  private readonly dateFormatter = new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  protected readonly toasts = computed(() => this.notifications.notifications().slice(0, 4));
  protected readonly typeClasses = TYPE_CLASSES;

  protected formatDate(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return this.dateFormatter.format(parsed);
  }

  protected dismissToast(id: string): void {
    this.notifications.dismiss(id);
  }
}
