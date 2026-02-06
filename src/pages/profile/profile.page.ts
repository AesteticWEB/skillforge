import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppStore } from '@/app/store/app.store';
import { AnalyticsEventsStore } from '@/features/analytics';
import { AchievementsStore, SkillMasteryAchievement } from '@/features/achievements';
import { NotificationsStore } from '@/features/notifications';
import type { Badge, BadgeRarity, EarnedBadge } from '@/entities/cosmetics';
import { BADGES_CATALOG } from '@/entities/cosmetics';
import {
  ACHIEVEMENTS_BY_ID,
  ACHIEVEMENTS_CATALOG,
  AchievementCategory,
  AchievementDefinition,
} from '@/entities/achievements';
import type { SkillStageId } from '@/shared/config';
import {
  PROFESSION_STAGE_SKILLS,
  SKILL_STAGE_LABELS,
  SKILL_STAGE_ORDER,
  SPECIALIZATIONS,
} from '@/shared/config';
import type { PerkEffects } from '@/shared/config';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';
import { EmptyStateComponent } from '@/shared/ui/empty-state';
import { InputComponent } from '@/shared/ui/input';

type StageMasteryCard = {
  stageId: keyof typeof SKILL_STAGE_LABELS;
  stageLabel: string;
  masteredCount: number;
  total: number;
  achievements: SkillMasteryAchievement[];
};

type CertificateRow = {
  id: string;
  professionLabel: string;
  stageLabel: string;
  score: number;
  issuedAt: string;
};

type SpecializationCard = {
  id: string;
  title: string;
  desc: string;
  effects: PerkEffects;
};

type BadgeCard = Badge & {
  earned: boolean;
  earnedAtIso?: string;
  source?: EarnedBadge['source'];
};

type AchievementCard = AchievementDefinition & {
  unlocked: boolean;
  unlockedAt?: string;
};

type AchievementGroup = {
  id: AchievementCategory;
  title: string;
  achievements: AchievementCard[];
};

const CERT_STAGE_LABELS: Record<SkillStageId, string> = {
  internship: 'Стажировка',
  junior: 'Джуниор',
  middle: 'Миддл',
  senior: 'Сеньор',
};

const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  shop: 'Магазин',
  company: 'Компания',
  debt: 'Техдолг',
  streak: 'Серия',
  ending: 'Концовки',
};

const ACHIEVEMENT_CATEGORY_ORDER: AchievementCategory[] = [
  'shop',
  'company',
  'debt',
  'streak',
  'ending',
];

const BADGE_RARITY_LABELS: Record<BadgeRarity, string> = {
  common: 'Обычный',
  rare: 'Редкий',
  epic: 'Эпический',
  legendary: 'Легендарный',
};

@Component({
  selector: 'app-profile-page',
  imports: [CardComponent, ButtonComponent, InputComponent, EmptyStateComponent, NgClass],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
  private readonly store = inject(AppStore);
  private readonly router = inject(Router);
  private readonly analyticsStore = inject(AnalyticsEventsStore);
  private readonly achievementsStore = inject(AchievementsStore);
  private readonly notifications = inject(NotificationsStore);

  protected readonly auth = this.store.auth;
  protected readonly user = this.store.user;
  protected readonly xp = this.store.xp;
  protected readonly careerProgress = this.store.careerProgress;
  protected readonly nextStageLabel = this.store.nextStageLabel;
  protected readonly canAdvanceStage = this.store.canAdvanceSkillStage;
  protected readonly stagePromotionGate = this.store.stagePromotionGate;
  protected readonly stagePromotionReasons = this.store.stagePromotionReasons;
  protected readonly certificates = this.store.certificates;
  protected readonly hasCertificates = computed(() => this.certificates().length > 0);
  protected readonly specializationId = this.store.specializationId;
  protected readonly specializationOptions = computed<SpecializationCard[]>(() => {
    const professionId = this.store.examProfessionId();
    if (!professionId) {
      return [];
    }
    const list = SPECIALIZATIONS[professionId] ?? [];
    return list.map((spec) => ({
      id: spec.id,
      title: spec.title,
      desc: spec.desc,
      effects: spec.effects,
    }));
  });
  protected readonly hasSpecializations = computed(() => this.specializationOptions().length > 0);
  protected readonly certificateRows = computed<CertificateRow[]>(() => {
    const examsById = this.store.examsById();
    return this.certificates()
      .slice()
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
      .map((certificate) => {
        const exam = examsById[certificate.examId];
        const professionLabel = exam
          ? this.extractProfessionLabel(exam.title)
          : certificate.professionId;
        return {
          id: certificate.id,
          professionLabel,
          stageLabel: CERT_STAGE_LABELS[certificate.stage] ?? certificate.stage,
          score: certificate.score,
          issuedAt: this.formatCertificateDate(certificate.issuedAt),
        };
      });
  });
  protected readonly createdAt = computed(() => {
    const value = this.user().startDate?.trim() ?? '';
    return value.length > 0 ? value : null;
  });

  protected readonly earnedBadges = this.store.earnedBadges;
  protected readonly badgeCatalog = BADGES_CATALOG;
  protected readonly earnedBadgesCount = computed(() => this.earnedBadges().length);
  protected readonly badgeCards = computed<BadgeCard[]>(() => {
    const earnedMap = new Map(this.earnedBadges().map((badge) => [badge.id, badge]));
    return BADGES_CATALOG.map((badge) => {
      const earned = earnedMap.get(badge.id);
      return {
        ...badge,
        earned: Boolean(earned),
        earnedAtIso: earned?.earnedAtIso,
        source: earned?.source,
      };
    });
  });
  protected readonly recentBadges = computed(() => this.earnedBadges().slice(0, 5));

  protected readonly achievements = this.store.achievements;
  protected readonly achievementGroups = computed<AchievementGroup[]>(() => {
    const unlocked = this.achievements()?.unlocked ?? {};
    const grouped = new Map<AchievementCategory, AchievementCard[]>();

    for (const definition of ACHIEVEMENTS_CATALOG) {
      const entry = unlocked[definition.id];
      const card: AchievementCard = {
        ...definition,
        unlocked: Boolean(entry),
        unlockedAt: entry?.unlockedAt,
      };
      const list = grouped.get(definition.category) ?? [];
      list.push(card);
      grouped.set(definition.category, list);
    }

    return ACHIEVEMENT_CATEGORY_ORDER.filter((category) => grouped.has(category)).map(
      (category) => ({
        id: category,
        title: ACHIEVEMENT_CATEGORY_LABELS[category] ?? category,
        achievements: grouped.get(category) ?? [],
      }),
    );
  });
  protected readonly recentAchievements = computed<AchievementCard[]>(() => {
    const unlocked = this.achievements()?.unlocked ?? {};
    const entries = Object.values(unlocked)
      .filter((entry): entry is { id: string; unlockedAt: string } =>
        Boolean(entry && typeof entry.unlockedAt === 'string'),
      )
      .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt));

    const cards: AchievementCard[] = [];
    for (const entry of entries) {
      const definition = ACHIEVEMENTS_BY_ID.get(entry.id as AchievementDefinition['id']);
      if (!definition) {
        continue;
      }
      cards.push({
        ...definition,
        unlocked: true,
        unlockedAt: entry.unlockedAt,
      });
      if (cards.length >= 5) {
        break;
      }
    }

    return cards;
  });

  protected readonly skillMasteries = this.achievementsStore.skillMasteries;
  protected readonly hasMasteries = computed(() => this.skillMasteries().length > 0);
  protected readonly stageMasteryCards = computed<StageMasteryCard[]>(() => {
    const profession = this.auth().profession || this.user().role;
    const mapping =
      PROFESSION_STAGE_SKILLS[profession as keyof typeof PROFESSION_STAGE_SKILLS] ?? null;

    return SKILL_STAGE_ORDER.map((stageId) => {
      const stageSkills = mapping?.[stageId] ?? [];
      const achievements = this.skillMasteries().filter(
        (achievement) => achievement.stage === stageId,
      );
      const achievedIds = new Set(achievements.map((item) => item.skillId));
      const masteredCount = stageSkills.filter((id) => achievedIds.has(id)).length;

      return {
        stageId,
        stageLabel: SKILL_STAGE_LABELS[stageId],
        masteredCount,
        total: stageSkills.length,
        achievements,
      };
    });
  });

  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly repeatPassword = signal('');
  protected readonly passwordBlockReason = computed(() => {
    if (this.newPassword().trim().length < 6) {
      return 'Минимум 6 символов';
    }
    if (this.newPassword() !== this.repeatPassword()) {
      return 'Пароли не совпадают';
    }
    return null;
  });
  protected readonly isPasswordDisabled = computed(() => this.passwordBlockReason() !== null);

  protected changePassword(): void {
    if (this.isPasswordDisabled()) {
      return;
    }

    this.currentPassword.set('');
    this.newPassword.set('');
    this.repeatPassword.set('');
    this.notifications.success('Пароль обновлён.');
  }

  protected advanceStage(): void {
    this.store.advanceSkillStage();
  }

  protected logout(): void {
    this.store.logout();
    this.analyticsStore.clear();
    this.achievementsStore.reset();
    void this.router.navigateByUrl('/');
  }

  protected goToExam(): void {
    void this.router.navigateByUrl('/exam');
  }

  protected selectSpecialization(specId: string): void {
    this.store.setSpecialization(specId);
  }

  protected getBadgeTitle(badgeId: string): string {
    return this.store.getBadgeTitle(badgeId);
  }

  protected formatSpecializationEffects(effects: PerkEffects): string {
    const parts: string[] = [];

    if (this.isNonZero(effects.coinsBonusPct)) {
      parts.push(`Монеты ${this.formatSignedPercent(effects.coinsBonusPct ?? 0)}`);
    }
    if (this.isNonZero(effects.xpBonusPct)) {
      parts.push(`XP ${this.formatSignedPercent(effects.xpBonusPct ?? 0)}`);
    }
    if (this.isNonZero(effects.repBonusFlat)) {
      parts.push(`Репутация ${this.formatSigned(effects.repBonusFlat ?? 0)}`);
    }
    if (this.isNonZero(effects.techDebtReduceFlat)) {
      const delta = -(effects.techDebtReduceFlat ?? 0);
      parts.push(`Техдолг ${this.formatSigned(delta)}`);
    }
    if (this.isNonZero(effects.cashIncomeBonusPct)) {
      parts.push(`Доход ${this.formatSignedPercent(effects.cashIncomeBonusPct ?? 0)}`);
    }
    if (this.isNonZero(effects.incidentReducePct)) {
      const delta = -(effects.incidentReducePct ?? 0);
      parts.push(`Инциденты ${this.formatSignedPercent(delta)}`);
    }
    if (this.isNonZero(effects.candidateQualityBonusPct)) {
      parts.push(
        `Качество кандидатов ${this.formatSignedPercent(effects.candidateQualityBonusPct ?? 0)}`,
      );
    }

    return parts.length > 0 ? parts.join(' • ') : 'Без бонусов';
  }

  protected createNewAccount(): void {
    const confirmed = window.confirm('Это удалит прогресс, XP, историю и достижения. Продолжить?');
    if (!confirmed) {
      return;
    }

    this.store.resetAll();
    this.analyticsStore.clear();
    this.achievementsStore.reset();
    void this.router.navigateByUrl('/');
  }

  private extractProfessionLabel(title: string): string {
    const separator = ' · ';
    if (title.includes(separator)) {
      return title.split(separator)[0]?.trim() || title;
    }
    return title;
  }

  private isNonZero(value?: number): boolean {
    return typeof value === 'number' && Number.isFinite(value) && value !== 0;
  }

  private formatSigned(value: number): string {
    const sign = value >= 0 ? '+' : '-';
    const abs = Math.abs(value);
    const formatted = Number.isInteger(abs) ? abs.toFixed(0) : abs.toFixed(1);
    return `${sign}${formatted}`;
  }

  private formatSignedPercent(value: number): string {
    const sign = value >= 0 ? '+' : '-';
    const abs = Math.round(Math.abs(value) * 100);
    return `${sign}${abs}%`;
  }

  private formatCertificateDate(value: string): string {
    if (!value) {
      return '—';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString();
  }

  protected formatBadgeDate(value?: string): string {
    if (!value) {
      return '—';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString();
  }

  protected formatAchievementDate(value?: string): string {
    if (!value) {
      return '—';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString();
  }

  protected formatBadgeRarity(rarity: BadgeRarity): string {
    return BADGE_RARITY_LABELS[rarity] ?? rarity;
  }
}
