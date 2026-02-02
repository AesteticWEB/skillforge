import { inject, isDevMode } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';

export const devOnlyGuard: CanMatchFn = () => {
  if (isDevMode()) {
    return true;
  }

  const router = inject(Router);
  return router.createUrlTree(['/']);
};
