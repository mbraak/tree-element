export const isInt = (n: unknown): boolean => Number.isInteger(n);

export const getBoolString = (value: unknown): string =>
  value ? "true" : "false";
