import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppStore } from '@/app/store/app.store';
import { ButtonComponent } from '@/shared/ui/button';
import { CardComponent } from '@/shared/ui/card';
import { EmptyStateComponent } from '@/shared/ui/empty-state';
import { buildRoadmapViewModel, type RoadmapViewModel } from './roadmap.vm';

type CtaState = {
  disabled: boolean;
  reason: string | null;
};

@Component({
  selector: 'app-roadmap-page',
  imports: [CardComponent, ButtonComponent, EmptyStateComponent, NgClass],
  templateUrl: './roadmap.page.html',
  styleUrl: './roadmap.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoadmapPage {
  private readonly store = inject(AppStore);
  private readonly router = inject(Router);

  protected readonly isRegistered = this.store.isRegistered;
  protected readonly hasProfile = this.store.hasProfile;

  protected readonly viewModel = computed<RoadmapViewModel>(() => {
    const meta = this.store.progress().meta ?? { isNewGamePlus: false, ngPlusCount: 0 };
    const company = this.store.company();
    return buildRoadmapViewModel({
      careerStage: this.store.careerStage(),
      stageSkillProgress: this.store.stageSkillProgress(),
      stageScenarioProgress: this.store.stageScenarioProgress(),
      promotionGate: this.store.stagePromotionGate(),
      canAdvanceStage: this.store.canAdvanceSkillStage(),
      certificates: this.store.certificates(),
      examProfessionId: this.store.examProfessionId(),
      isCompanyUnlocked: this.store.companyUnlocked(),
      companyLevel: company.level,
      isNewGamePlus: meta.isNewGamePlus ?? false,
      ngPlusCount: meta.ngPlusCount ?? 0,
    });
  });

  protected readonly scenarioCta = computed<CtaState>(() => {
    const career = this.viewModel().career;
    if (career.scenariosTotal === 0) {
      return { disabled: true, reason: 'Сценарии недоступны.' };
    }
    if (career.scenariosCompletedCurrent >= career.scenariosTotal) {
      return { disabled: true, reason: 'Сценарии этапа пройдены.' };
    }
    return { disabled: false, reason: null };
  });

  protected readonly skillCta = computed<CtaState>(() => {
    const career = this.viewModel().career;
    if (career.skillsTotal === 0) {
      return { disabled: true, reason: 'Навыки недоступны.' };
    }
    if (career.skillsMasteredCurrent >= career.skillsTotal) {
      return { disabled: true, reason: 'Навыки этапа уже max.' };
    }
    return { disabled: false, reason: null };
  });

  protected readonly examCta = computed<CtaState>(() => {
    const career = this.viewModel().career;
    const gate = this.store.stagePromotionGate();
    if (!career.examAvailable) {
      return { disabled: true, reason: 'Экзамены недоступны.' };
    }
    if (gate.requiredCert) {
      return { disabled: false, reason: null };
    }
    return { disabled: true, reason: 'Сертификат уже получен.' };
  });

  protected readonly companyCta = computed<CtaState>(() => {
    const company = this.viewModel().company;
    if (!company.isCompanyUnlocked) {
      return {
        disabled: true,
        reason: company.missingReasons.join(' '),
      };
    }
    return { disabled: false, reason: null };
  });

  protected goTo(route: string): void {
    void this.router.navigate([route]);
  }

  protected careerStageClass(
    status: RoadmapViewModel['career']['stages'][number]['status'],
  ): string {
    switch (status) {
      case 'current':
        return 'border-emerald-400/60 bg-emerald-400/10 text-emerald-200';
      case 'completed':
        return 'border-slate-700 bg-slate-900/60 text-slate-300';
      default:
        return 'border-slate-800 bg-slate-950/40 text-slate-500';
    }
  }

  protected companyStageClass(
    status: RoadmapViewModel['company']['levels'][number]['status'],
  ): string {
    switch (status) {
      case 'locked':
        return 'border-rose-500/40 bg-rose-500/10 text-rose-200';
      case 'current':
        return 'border-emerald-400/60 bg-emerald-400/10 text-emerald-200';
      case 'completed':
        return 'border-slate-700 bg-slate-900/60 text-slate-300';
      default:
        return 'border-slate-800 bg-slate-950/40 text-slate-500';
    }
  }
}
