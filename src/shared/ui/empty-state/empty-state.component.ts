import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

type EmptyStateSize = 'sm' | 'md';

const SIZE_CLASSES: Record<EmptyStateSize, string> = {
  sm: 'px-5 py-6',
  md: 'px-6 py-8',
};

const ILLUSTRATION_CLASSES: Record<EmptyStateSize, string> = {
  sm: 'h-12 w-12',
  md: 'h-16 w-16',
};

@Component({
  selector: 'sf-empty-state',
  imports: [NgClass],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  @Input() title = 'Nothing here yet';
  @Input() description = 'When data appears, it will show up in this section.';
  @Input() size: EmptyStateSize = 'md';

  get containerClasses(): string {
    return SIZE_CLASSES[this.size];
  }

  get illustrationClasses(): string {
    return ILLUSTRATION_CLASSES[this.size];
  }
}
