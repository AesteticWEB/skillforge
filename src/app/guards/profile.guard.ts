import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AppStore } from '../store/app.store';

export const profileGuard: CanMatchFn = () => {
  const store = inject(AppStore);
  const router = inject(Router);

  return store.hasProfile() ? true : router.createUrlTree(['/onboarding']);
};
