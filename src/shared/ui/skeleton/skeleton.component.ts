import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'sf-skeleton',
  imports: [NgClass],
  templateUrl: './skeleton.component.html',
  styleUrl: './skeleton.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonComponent {
  @Input() count = 3;
  @Input() columns = false;

  get items(): number[] {
    return Array.from({ length: this.count }, (_, index) => index);
  }
}
