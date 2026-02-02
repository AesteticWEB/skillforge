import { expect, test } from '@playwright/test';

const completeOnboarding = async (page: Parameters<typeof test>[0]['page']) => {
  await page.goto('/onboarding');
  await page.locator('input#goal').fill('Improve architecture execution');

  const checkboxes = page.getByRole('checkbox');
  await checkboxes.nth(0).check();
  await checkboxes.nth(1).check();
  await checkboxes.nth(2).check();

  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(/\/skills$/);
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
});

test('onboarding to skills and upgrade', async ({ page }) => {
  await completeOnboarding(page);

  const architectureCard = page.locator('sf-card', { hasText: 'Frontend Architecture' }).first();
  await expect(architectureCard).toContainText('Level 1 / 5');

  await page.getByRole('button', { name: 'Increase Frontend Architecture' }).click();
  await expect(architectureCard).toContainText('Level 2 / 5');
});

test('simulator decision updates analytics', async ({ page }) => {
  await completeOnboarding(page);

  await page.getByRole('link', { name: /Simulator/ }).click();
  await page.getByRole('link', { name: /Legacy Refactor/ }).click();
  await page.getByRole('button', { name: /Ship a minimal refactor/ }).click();

  await page.getByRole('link', { name: /Analytics/ }).click();
  await expect(page.getByText('Decisions logged: 1')).toBeVisible();
  await expect(page.getByText('Legacy Refactor')).toBeVisible();
});
