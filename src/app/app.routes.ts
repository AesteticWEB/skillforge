import { Routes } from '@angular/router';
import { profileGuard } from './guards/profile.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'SkillForge',
    loadComponent: () => import('../pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'onboarding',
    title: 'Onboarding · SkillForge',
    loadComponent: () =>
      import('../pages/onboarding/onboarding.page').then((m) => m.OnboardingPage),
  },
  {
    path: 'skills',
    title: 'Skills · SkillForge',
    canMatch: [profileGuard],
    loadComponent: () => import('../pages/skills/skills.page').then((m) => m.SkillsPage),
  },
  {
    path: 'simulator',
    title: 'Simulator · SkillForge',
    canMatch: [profileGuard],
    loadComponent: () =>
      import('../pages/simulator/simulator.page').then((m) => m.SimulatorPage),
  },
  {
    path: 'simulator/:id',
    title: 'Scenario · SkillForge',
    canMatch: [profileGuard],
    loadComponent: () =>
      import('../pages/simulator/simulator-detail.page').then((m) => m.SimulatorDetailPage),
  },
  {
    path: 'analytics',
    title: 'Analytics · SkillForge',
    canMatch: [profileGuard],
    loadComponent: () =>
      import('../pages/analytics/analytics.page').then((m) => m.AnalyticsPage),
  },
];
