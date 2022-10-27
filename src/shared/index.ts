export const extend = Object.assign;

export const isObject = (value) => value !== null && typeof value === "object";

export const hasChange = (value, newValue) => {
  return !Object.is(value, newValue);
};

export const isOn = (value) => /^on[A-Z]/.test(value);

export const hasOwn = (target, key) =>
  Object.prototype.hasOwnProperty.call(target, key);
