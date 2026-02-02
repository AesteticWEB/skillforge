import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { NotificationsStore } from '@/features/notifications';
import { AppStore } from '../store/app.store';

export const profileGuard: CanMatchFn = () => {
  const store = inject(AppStore);
  const router = inject(Router);
  const notifications = inject(NotificationsStore);

  if (!store.isRegistered()) {
    return router.createUrlTree(['/']);
  }

  if (store.hasProfile()) {
    return true;
  }

  notifications.notify('Заполните профиль, чтобы продолжить.', 'info');
  return router.createUrlTree(['/profile']);
};
