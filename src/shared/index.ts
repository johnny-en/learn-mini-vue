export const extend = Object.assign;

export const EMPTY_OBJ = {};

export const isObject = (value) => value !== null && typeof value === "object";

export const hasChange = (value, newValue) => {
  return !Object.is(value, newValue);
};

export const isOn = (value) => /^on[A-Z]/.test(value);

export const hasOwn = (target, key) =>
  Object.prototype.hasOwnProperty.call(target, key);

// add -> Add
const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

// add -> onAdd
export const toHandlerKey = (str: string) =>
  str ? "on" + capitalize(str) : "";

// add-foo -> addFoo
export const camelize = (str: string) =>
  str.replace(/-(\w)/g, (_, s) => (s ? s.toUpperCase() : ""));
