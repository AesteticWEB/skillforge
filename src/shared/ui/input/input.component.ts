import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'sf-input',
  templateUrl: './input.component.html',
  styleUrl: './input.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputComponent {
  @Input() type: 'text' | 'email' | 'password' | 'number' = 'text';
  @Input() placeholder = '';
  @Input() name?: string;
  @Input() id?: string;
  @Input() value?: string;
}
