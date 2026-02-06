export const normalizeLogin = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
};

export const isValidLogin = (login: string): boolean =>
  /^[a-zA-Z0-9._-]{3,32}$/.test(login);

export const isValidPassword = (password: string): boolean =>
  typeof password === "string" && password.length >= 8 && password.length <= 128;
