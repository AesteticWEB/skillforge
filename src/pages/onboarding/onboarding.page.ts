import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { CardComponent } from '../../shared/ui/card/card.component';
import { InputComponent } from '../../shared/ui/input/input.component';

@Component({
  selector: 'app-onboarding-page',
  imports: [CardComponent, InputComponent, ButtonComponent],
  templateUrl: './onboarding.page.html',
  styleUrl: './onboarding.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingPage {}
