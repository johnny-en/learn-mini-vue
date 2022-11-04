import { createRenderer } from "../runtime-core";
import { isOn } from "../shared";

function createElement(type) {
  return document.createElement(type);
}

function patchProp(el, key, value) {
  if (isOn(key)) {
    const event = key.slice(2).toLowerCase();
    el.addEventListener(event, value);
  } else {
    el.setAttribute(key, value);
  }
}

function insert(el, parent) {
  parent.append(el);
}

const renderer: any = createRenderer({
  createElement,
  patchProp,
  insert,
});

export function createApp(...args) {
  return renderer.createApp(...args);
}

// 将更底层的 runtime-core 放到 runtime-dom 中
export * from "../runtime-core";
