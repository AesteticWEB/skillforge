import type { Contract } from '../model/contract.model';

export const MAX_ACTIVE_CONTRACTS = 3;

export const canAcceptContract = (
  activeCount: number,
  maxActive: number = MAX_ACTIVE_CONTRACTS,
): boolean => {
  if (!Number.isFinite(activeCount)) {
    return false;
  }
  return Math.floor(activeCount) < maxActive;
};

export const trimActiveContracts = (
  active: Contract[],
  maxActive: number = MAX_ACTIVE_CONTRACTS,
): Contract[] => {
  if (!Array.isArray(active)) {
    return [];
  }
  return active.slice(0, Math.max(0, Math.floor(maxActive)));
};
