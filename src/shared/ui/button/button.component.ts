import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

type ButtonVariant = 'primary' | 'ghost';

const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 disabled:pointer-events-none disabled:opacity-50';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-emerald-400 text-slate-950 hover:bg-emerald-300',
  ghost: 'border border-slate-700 bg-slate-900/60 text-slate-100 hover:bg-slate-900',
};

@Component({
  selector: 'sf-button',
  templateUrl: './button.component.html',
  styleUrl: './button.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() variant: ButtonVariant = 'primary';
  @Input() disabled = false;

  get classes(): string {
    return `${BASE_CLASSES} ${VARIANT_CLASSES[this.variant]}`;
  }
}
