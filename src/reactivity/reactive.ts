import { mutableHandlers, readonlyHandlers } from "./baseHandlers";

export function reactive(raw) {
  return creatActiveObject(raw, mutableHandlers);
}

export function readonly(raw) {
  return creatActiveObject(raw, readonlyHandlers);
}
function creatActiveObject(raw: any, baseHandlers) {
  return new Proxy(raw, baseHandlers);
}
