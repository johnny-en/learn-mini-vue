/**
 * 使用二进制标识虚拟节点类型
 * patch 阶段使用
 */
export const enum ShapeFlags {
  ELEMENT = 1, // 0001 普通元素
  STATEFUL_COMPONENT = 1 << 1, // 0010 有状态的组件
  TEXT_CHILDREN = 1 << 2, // 0100 子节点为文本
  ARRAY_CHILDREN = 1 << 3, // 1000 子节点为数组
  SLOT_CHILDREN = 1 << 4, // 10000 子节点为 slots
}
