export type RouteParamsWithId = {
  params: Promise<{ id?: string | null }>;
};

export const getRequiredId = async (context: RouteParamsWithId): Promise<string | null> => {
  const { id } = await context.params;
  if (typeof id !== "string") {
    return null;
  }
  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : null;
};
