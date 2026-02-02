import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { NotificationsStore } from '@/features/notifications';
import { AppStore } from '../store/app.store';

export const authGuard: CanMatchFn = () => {
  const store = inject(AppStore);
  if (store.isRegistered()) {
    return true;
  }

  const router = inject(Router);
  const notifications = inject(NotificationsStore);
  notifications.notify('Чтобы продолжить, зарегистрируйтесь.', 'info');
  return router.createUrlTree(['/']);
};
