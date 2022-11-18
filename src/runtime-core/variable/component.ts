let currentInstance_data = null;
let compiler_data;

export function currentInstance() {
  return currentInstance_data;
}
export function setCurrentInstance(value) {
  currentInstance_data = value;
}
export function compiler() {
  return compiler_data;
}
export function setCompiler(value) {
  compiler_data = value;
}
