import type { IsoDateString } from '@/entities/user';
import type { SkillStageId } from '@/shared/config';

export type Certificate = {
  id: string;
  professionId: string;
  stage: SkillStageId;
  examId: string;
  issuedAt: IsoDateString;
  score: number;
};
