import type { SkillStageId } from '@/shared/config';
import type { Certificate } from '../model/certificates.model';

export const makeCertificateId = (professionId: string, stage: SkillStageId): string =>
  `cert_${professionId}_${stage}`;

export const hasCertificate = (
  certificates: Certificate[],
  professionId: string,
  stage: SkillStageId,
): boolean => {
  const id = makeCertificateId(professionId, stage);
  return certificates.some((certificate) => certificate.id === id);
};

export const upsertCertificate = (
  certificates: Certificate[],
  next: Certificate,
): Certificate[] => {
  const index = certificates.findIndex((certificate) => certificate.id === next.id);
  if (index === -1) {
    return [...certificates, next];
  }
  const current = certificates[index];
  if (next.score <= current.score) {
    return certificates;
  }
  const updated: Certificate = {
    ...current,
    score: next.score,
  };
  return [...certificates.slice(0, index), updated, ...certificates.slice(index + 1)];
};
