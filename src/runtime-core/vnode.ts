import { ShapeFlags } from "../shared/ShapeFlags";

export const Fragment = Symbol("Fragment");
export const Text = Symbol("Text");

export function createVNode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
    el: null,
    shapeFlag: shapeFlag(type),
  };

  setChildrenShapeFlag(vnode);
  setSlotsShapeFlag(vnode);

  return vnode;
}

export function createTextVNode(text: string) {
  return createVNode(Text, {}, text);
}

function shapeFlag(type) {
  return typeof type === "string"
    ? ShapeFlags.ELEMENT
    : ShapeFlags.STATEFUL_COMPONENT;
}

/**
 * 设置 vnode 子节点类型
 * 0001 | 0100 -> 0101
 * vnode 是元素类型，children 是文本类型
 * 0010 | 1000 -> 1010
 * vnode 是组件类型，children 是数据类型
 */
function setChildrenShapeFlag(vnode) {
  const { children } = vnode;
  if (typeof children === "string") {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
  } else if (Array.isArray(children)) {
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
  }
}

/**
 * 设置 vnode slot 类型
 * 当 vnode 类型是组件 & 子节点是对象类型
 * 0001 | 10000 -> 10001
 */
function setSlotsShapeFlag(vnode) {
  if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    if (typeof vnode.children === "object") {
      vnode.shapeFlag |= ShapeFlags.SLOT_CHILDREN;
    }
  }
}
