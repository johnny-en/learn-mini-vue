let currentInstance_data = null;

export function currentInstance() {
  return currentInstance_data;
}
export function setCurrentInstance(value) {
  currentInstance_data = value;
}
