export const normalizeMultiChoice = (ids: string[]): string[] => {
  if (!Array.isArray(ids)) {
    return [];
  }
  const unique = new Set<string>();
  for (const entry of ids) {
    if (typeof entry === 'string' && entry.trim().length > 0) {
      unique.add(entry);
    }
  }
  return Array.from(unique).sort((left, right) => left.localeCompare(right));
};

export const isMultiChoiceCorrect = (selected: string[], correct: string[]): boolean => {
  const normalizedSelected = normalizeMultiChoice(selected);
  const normalizedCorrect = normalizeMultiChoice(correct);
  if (normalizedCorrect.length === 0) {
    return normalizedSelected.length === 0;
  }
  if (normalizedSelected.length !== normalizedCorrect.length) {
    return false;
  }
  return normalizedSelected.every((id, index) => id === normalizedCorrect[index]);
};

export const isOrderingCorrect = (selectedOrder: string[], correctOrder: string[]): boolean => {
  if (selectedOrder.length !== correctOrder.length) {
    return false;
  }
  return selectedOrder.every((id, index) => id === correctOrder[index]);
};
