import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { devOnlyGuard } from './guards/dev-only.guard';

export const routes: Routes = [
  {
    path: '',
    title: '\u0413\u043b\u0430\u0432\u043d\u0430\u044f | SkillForge',
    loadComponent: () => import('../pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'onboarding',
    title: '\u041f\u0440\u043e\u0444\u0438\u043b\u044c | SkillForge',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/profile/profile.page').then((m) => m.ProfilePage),
  },
  {
    path: 'profile',
    title: '\u041f\u0440\u043e\u0444\u0438\u043b\u044c | SkillForge',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/profile/profile.page').then((m) => m.ProfilePage),
  },
  {
    path: 'skills',
    title: '\u041d\u0430\u0432\u044b\u043a\u0438 | SkillForge',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/skills/skills.page').then((m) => m.SkillsPage),
  },
  {
    path: 'shop',
    title: '\u041c\u0430\u0433\u0430\u0437\u0438\u043d | SkillForge',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/shop/shop.page').then((m) => m.ShopPage),
  },
  {
    path: 'company',
    title: '\u041a\u043e\u043c\u043f\u0430\u043d\u0438\u044f | SkillForge',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/company/company.page').then((m) => m.CompanyPage),
  },
  {
    path: 'simulator',
    title: '\u0421\u0438\u043c\u0443\u043b\u044f\u0442\u043e\u0440 | SkillForge',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/simulator/simulator.page').then((m) => m.SimulatorPage),
  },
  {
    path: 'simulator/:id',
    title: '\u0421\u0446\u0435\u043d\u0430\u0440\u0438\u0439 | SkillForge',
    canMatch: [authGuard],
    loadComponent: () =>
      import('../pages/simulator/simulator-detail.page').then((m) => m.SimulatorDetailPage),
  },
  {
    path: 'ending',
    title: '\u0424\u0438\u043d\u0430\u043b | SkillForge',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/ending/ending.page').then((m) => m.EndingPage),
  },
  {
    path: 'exam',
    title: '\u042d\u043a\u0437\u0430\u043c\u0435\u043d | SkillForge',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/exam/exam.page').then((m) => m.ExamPage),
  },
  {
    path: 'analytics',
    title: '\u0410\u043d\u0430\u043b\u0438\u0442\u0438\u043a\u0430 | SkillForge',
    canMatch: [authGuard],
    loadComponent: () => import('../pages/analytics/analytics.page').then((m) => m.AnalyticsPage),
  },
  {
    path: 'debug',
    title: '\u041e\u0442\u043b\u0430\u0434\u043a\u0430 | SkillForge',
    canMatch: [authGuard, devOnlyGuard],
    loadComponent: () =>
      import('../pages/settings-debug/settings-debug.page').then((m) => m.SettingsDebugPage),
  },
  {
    path: 'settings/debug',
    canMatch: [authGuard, devOnlyGuard],
    title: '\u041e\u0442\u043b\u0430\u0434\u043a\u0430 | SkillForge',
    loadComponent: () =>
      import('../pages/settings-debug/settings-debug.page').then((m) => m.SettingsDebugPage),
  },
];
