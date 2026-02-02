import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';

@Component({
  selector: 'app-home-page',
  imports: [CardComponent, ButtonComponent],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {}
