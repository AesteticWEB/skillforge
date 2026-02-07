import { expect, test } from '@playwright/test';

const register = async (page: Parameters<typeof test>[0]['page']) => {
  const login = `e2e-user-${Date.now()}`;
  await expect(page.getByTestId('home-guest')).toBeVisible();
  await page.getByTestId('home-start').click();
  await expect(page.getByTestId('login-input')).toBeVisible();
  await page.getByTestId('login-input').fill(login);
  await page.getByTestId('password-input').fill('password');
  await page.getByTestId('profession-select').selectOption({ index: 1 });
  await expect(page.getByTestId('login-submit')).toBeEnabled();
  await page.getByTestId('login-submit').click();
  const dashboard = page.getByTestId('home-dashboard');
  const onboardingSkip = page.getByTestId('onboarding-skip');
  await Promise.race([
    dashboard.waitFor({ state: 'visible' }),
    onboardingSkip.waitFor({ state: 'visible' }),
  ]);
  if (await onboardingSkip.isVisible()) {
    await onboardingSkip.click();
  }
  await expect(dashboard).toBeVisible();
  await page.waitForFunction(() => {
    const raw = window.localStorage.getItem('skillforge.state.v5');
    return Boolean(raw && raw.includes('"isRegistered":true'));
  });
};

const toNumber = async (value: string | null): Promise<number> => {
  if (!value) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const readPersistedCoins = async (page: Parameters<typeof test>[0]['page']) =>
  page.evaluate(() => {
    const raw = window.localStorage.getItem('skillforge.state.v5');
    if (!raw) {
      return 0;
    }
    try {
      const parsed = JSON.parse(raw) as { progress?: { coins?: number } };
      return typeof parsed.progress?.coins === 'number' ? parsed.progress.coins : 0;
    } catch {
      return 0;
    }
  });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test('happy path flow', async ({ page }) => {
  await register(page);

  await page.getByTestId('nav-simulator').click();
  await expect(page).toHaveURL(/\/simulator$/);
  const scenarioCard = page.getByTestId('scenario-card').first();
  await expect(scenarioCard).toBeVisible();
  const scenarioId = await scenarioCard.getAttribute('data-scenario-id');
  const coinsBefore = await readPersistedCoins(page);

  await scenarioCard.click();
  await page.locator('[data-testid="scenario-decision"][data-correct="true"]').first().click();
  await expect(page.getByTestId('reward-modal')).toBeVisible();
  await page.getByTestId('reward-modal-close').click();
  await expect(page).toHaveURL(/\/simulator$/);

  await page.waitForFunction((before) => {
    const raw = window.localStorage.getItem('skillforge.state.v5');
    if (!raw) {
      return false;
    }
    try {
      const parsed = JSON.parse(raw) as { progress?: { coins?: number } };
      return typeof parsed.progress?.coins === 'number' && parsed.progress.coins > before;
    } catch {
      return false;
    }
  }, coinsBefore);

  if (scenarioId) {
    await expect(
      page.locator(`[data-testid="scenario-card"][data-scenario-id="${scenarioId}"]`),
    ).toHaveCount(0);
  }

  await page.getByTestId('nav-skills').click();
  await expect(page).toHaveURL(/\/skills$/);
  const availableXp = await toNumber(
    await page.getByTestId('skills-available-xp').getAttribute('data-value'),
  );
  expect(availableXp).toBeGreaterThan(0);
  const firstSkillCard = page.getByTestId('skill-card').first();
  await expect(firstSkillCard).toBeVisible();
  const skillId = await firstSkillCard.getAttribute('data-skill-id');
  const levelBefore = await toNumber(await firstSkillCard.getAttribute('data-level'));

  if (skillId) {
    await page.getByTestId(`skill-upgrade-${skillId}`).click();
  }
  await expect(firstSkillCard).toHaveAttribute('data-level', String(levelBefore + 1));

  await page.getByTestId('nav-analytics').click();
  await expect(page).toHaveURL(/\/analytics$/);
  const decisionCount = await toNumber(
    await page.getByTestId('analytics-decision-count').getAttribute('data-value'),
  );
  expect(decisionCount).toBeGreaterThanOrEqual(1);
});
