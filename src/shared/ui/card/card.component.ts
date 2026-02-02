import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'sf-card',
  templateUrl: './card.component.html',
  styleUrl: './card.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {}
