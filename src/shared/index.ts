export const extend = Object.assign;

export const isObject = (value) => value !== null && typeof value === "object";

export const hasChange = (value, newValue) => {
  return !Object.is(value, newValue);
};

export const isOn = (value: string) => /^on[A-Z]/.test(value);
