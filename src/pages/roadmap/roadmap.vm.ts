import { hasCertificate, type Certificate } from '@/entities/certificates';
import { COMPANY_LEVELS, type CompanyLevel } from '@/entities/company';
import { SKILL_STAGE_LABELS, SKILL_STAGE_ORDER, type SkillStageId } from '@/shared/config';
import type { StageProgress } from '@/shared/lib/stage/promotion';

type PromotionGate = {
  ok: boolean;
  requiredCert?: {
    professionId: string;
    stage: SkillStageId;
  };
};

type CareerStageItem = {
  id: SkillStageId;
  label: string;
  status: 'completed' | 'current' | 'upcoming';
  statusLabel: string;
  isCurrent: boolean;
};

type CompanyStageItem = {
  id: 'locked' | CompanyLevel;
  label: string;
  status: 'locked' | 'current' | 'completed' | 'upcoming';
  statusLabel: string;
  isCurrent: boolean;
};

export type RoadmapState = {
  careerStage: SkillStageId;
  stageSkillProgress: StageProgress;
  stageScenarioProgress: StageProgress;
  promotionGate: PromotionGate;
  canAdvanceStage: boolean;
  certificates: Certificate[];
  examProfessionId: string | null;
  isCompanyUnlocked: boolean;
  companyLevel: CompanyLevel;
  isNewGamePlus: boolean;
  ngPlusCount: number;
};

export type RoadmapViewModel = {
  career: {
    stages: CareerStageItem[];
    currentStage: SkillStageId;
    currentStageLabel: string;
    skillsMasteredCurrent: number;
    skillsTotal: number;
    scenariosCompletedCurrent: number;
    scenariosTotal: number;
    examAvailable: boolean;
    hasCertForCurrentStage: boolean;
    canPromote: boolean;
    missingReasons: string[];
  };
  company: {
    levels: CompanyStageItem[];
    isCompanyUnlocked: boolean;
    companyLevel: CompanyLevel;
    missingReasons: string[];
  };
  isNgPlus: boolean;
};

const COMPANY_LABELS: Record<CompanyLevel, string> = {
  none: 'Locked',
  lead: 'Lead',
  manager: 'Manager',
  director: 'Director',
  cto: 'CTO',
};

const CAREER_STATUS_LABELS: Record<CareerStageItem['status'], string> = {
  completed: 'закрыт',
  current: 'текущий',
  upcoming: 'впереди',
};

const COMPANY_STATUS_LABELS: Record<CompanyStageItem['status'], string> = {
  locked: 'locked',
  completed: 'закрыт',
  current: 'текущий',
  upcoming: 'впереди',
};

export const buildRoadmapViewModel = (state: RoadmapState): RoadmapViewModel => {
  const stageIndex = SKILL_STAGE_ORDER.indexOf(state.careerStage);
  const stages: CareerStageItem[] = SKILL_STAGE_ORDER.map((stageId, index) => {
    const status = index < stageIndex ? 'completed' : index === stageIndex ? 'current' : 'upcoming';
    return {
      id: stageId,
      label: SKILL_STAGE_LABELS[stageId] ?? stageId,
      status,
      statusLabel: CAREER_STATUS_LABELS[status],
      isCurrent: index === stageIndex,
    };
  });

  const skillsTotal = Math.max(0, state.stageSkillProgress.total);
  const skillsMasteredCurrent = Math.min(
    Math.max(0, state.stageSkillProgress.completed),
    skillsTotal,
  );
  const scenariosTotal = Math.max(0, state.stageScenarioProgress.total);
  const scenariosCompletedCurrent = Math.min(
    Math.max(0, state.stageScenarioProgress.completed),
    scenariosTotal,
  );
  const examAvailable = Boolean(state.examProfessionId);
  const hasCertForCurrentStage =
    examAvailable && state.examProfessionId
      ? hasCertificate(state.certificates, state.examProfessionId, state.careerStage)
      : false;

  const canPromote = state.canAdvanceStage && state.promotionGate.ok;
  const missingReasons: string[] = [];
  if (skillsTotal > 0 && skillsMasteredCurrent < skillsTotal) {
    const remaining = skillsTotal - skillsMasteredCurrent;
    missingReasons.push(`Осталось прокачать навыки: ${remaining}/${skillsTotal}`);
  }
  if (scenariosTotal > 0 && scenariosCompletedCurrent < scenariosTotal) {
    const remaining = scenariosTotal - scenariosCompletedCurrent;
    missingReasons.push(`Осталось пройти сценарии: ${remaining}/${scenariosTotal}`);
  }
  if (examAvailable && state.promotionGate.requiredCert) {
    missingReasons.push('Нужен сертификат этапа');
  }
  if (missingReasons.length === 0) {
    missingReasons.push('Можно повышаться');
  }

  const companyLevels = COMPANY_LEVELS.filter((level) => level !== 'none');
  const track = ['locked', ...companyLevels] as const;
  const resolvedCompanyLevel = state.companyLevel === 'none' ? 'lead' : state.companyLevel;
  const currentCompanyIndex = state.isCompanyUnlocked
    ? Math.max(1, track.indexOf(resolvedCompanyLevel))
    : 0;

  const levels: CompanyStageItem[] = track.map((level, index) => {
    if (level === 'locked') {
      const status = state.isCompanyUnlocked ? 'completed' : 'locked';
      return {
        id: level,
        label: 'Locked',
        status,
        statusLabel: COMPANY_STATUS_LABELS[status],
        isCurrent: !state.isCompanyUnlocked,
      };
    }

    let status: CompanyStageItem['status'] = 'upcoming';
    if (!state.isCompanyUnlocked) {
      status = 'upcoming';
    } else if (index < currentCompanyIndex) {
      status = 'completed';
    } else if (index === currentCompanyIndex) {
      status = 'current';
    }

    return {
      id: level,
      label: COMPANY_LABELS[level],
      status,
      statusLabel: COMPANY_STATUS_LABELS[status],
      isCurrent: status === 'current',
    };
  });

  const missingCompanyReasons: string[] = [];
  if (!state.isCompanyUnlocked) {
    const hasSeniorCert =
      examAvailable && state.examProfessionId
        ? hasCertificate(state.certificates, state.examProfessionId, 'senior')
        : false;
    if (state.careerStage !== 'senior') {
      missingCompanyReasons.push('Откроется после этапа Senior');
    } else if (!hasSeniorCert) {
      missingCompanyReasons.push('Нужен сертификат Senior');
    } else {
      missingCompanyReasons.push('Откроется после подтверждения Senior');
    }
  }

  return {
    career: {
      stages,
      currentStage: state.careerStage,
      currentStageLabel: SKILL_STAGE_LABELS[state.careerStage] ?? state.careerStage,
      skillsMasteredCurrent,
      skillsTotal,
      scenariosCompletedCurrent,
      scenariosTotal,
      examAvailable,
      hasCertForCurrentStage,
      canPromote,
      missingReasons,
    },
    company: {
      levels,
      isCompanyUnlocked: state.isCompanyUnlocked,
      companyLevel: state.companyLevel,
      missingReasons: missingCompanyReasons,
    },
    isNgPlus: state.isNewGamePlus || state.ngPlusCount > 0,
  };
};
