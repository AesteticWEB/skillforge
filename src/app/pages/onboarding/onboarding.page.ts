import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-onboarding-page',
  templateUrl: './onboarding.page.html',
  styleUrl: './onboarding.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingPage {}
