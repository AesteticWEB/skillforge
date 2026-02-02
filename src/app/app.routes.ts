import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { devOnlyGuard } from './guards/dev-only.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'SkillForge — главная',
    loadComponent: () => import('../pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'onboarding',
    title: 'Профиль · SkillForge',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/profile/profile.page').then((m) => m.ProfilePage),
  },
  {
    path: 'profile',
    title: 'Профиль · SkillForge',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/profile/profile.page').then((m) => m.ProfilePage),
  },
  {
    path: 'skills',
    title: 'Навыки · SkillForge',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/skills/skills.page').then((m) => m.SkillsPage),
  },
  {
    path: 'simulator',
    title: 'Симулятор · SkillForge',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/simulator/simulator.page').then((m) => m.SimulatorPage),
  },
  {
    path: 'simulator/:id',
    title: 'Сценарий · SkillForge',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../pages/simulator/simulator-detail.page').then((m) => m.SimulatorDetailPage),
  },
  {
    path: 'analytics',
    title: 'Аналитика · SkillForge',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/analytics/analytics.page').then((m) => m.AnalyticsPage),
  },
  {
    path: 'debug',
    title: 'Отладка · SkillForge',
    canMatch: [authGuard, devOnlyGuard],
    loadComponent: () =>
      import('../pages/settings-debug/settings-debug.page').then((m) => m.SettingsDebugPage),
  },
  {
    path: 'settings/debug',
    canMatch: [authGuard, devOnlyGuard],
    title: 'Отладка · SkillForge',
    loadComponent: () =>
      import('../pages/settings-debug/settings-debug.page').then((m) => m.SettingsDebugPage),
  },
];
