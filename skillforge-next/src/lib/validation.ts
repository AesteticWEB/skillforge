export const normalizeLogin = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
};

export const isValidLogin = (login: string): boolean =>
  /^[a-zA-Z0-9._-]{3,32}$/.test(login);

const PASSWORD_MIN = 10;
const PASSWORD_MAX = 128;
const PASSWORD_POLICY = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export const isValidPassword = (password: string): boolean => {
  if (typeof password !== "string") {
    return false;
  }
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return false;
  }
  return PASSWORD_POLICY.test(password);
};
