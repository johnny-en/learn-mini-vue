import { ref, h } from "../../lib/mini-vue.esm.js";

/**
 * 1 左侧的对比
 * a b (c)
 * a b (d e)
 */
// const prevChildren = [
//   h("div", { key: "A" }, "A"),
//   h("div", { key: "B" }, "B"),
//   h("div", { key: "C" }, "C"),
// ];
// const nextChildren = [
//   h("div", { key: "A" }, "A"),
//   h("div", { key: "B" }, "B"),
//   h("div", { key: "D" }, "D"),
//   h("div", { key: "E" }, "E"),
// ];

/**
 * 2 右侧的对比
 * (a) b c
 * (d e) b c
 */
// const prevChildren = [
//   h("div", { key: "A" }, "A"),
//   h("div", { key: "B" }, "B"),
//   h("div", { key: "C" }, "C"),
// ];
// const nextChildren = [
//   h("div", { key: "D" }, "D"),
//   h("div", { key: "E" }, "E"),
//   h("div", { key: "B" }, "B"),
//   h("div", { key: "C" }, "C"),
// ];

/**
 * 3 新的比老的节点长 -> 创建新增的节点
 * 3.1 左侧
 * a b
 * a b (c d)
 */
// const prevChildren = [h("div", { key: "A" }, "A"), h("div", { key: "B" }, "B")];
// const nextChildren = [
//   h("div", { key: "A" }, "A"),
//   h("div", { key: "B" }, "B"),
//   h("div", { key: "C" }, "C"),
//   h("div", { key: "D" }, "D"),
// ];

/**
 * 3.2 右侧
 * c d
 * (a b) c d
 */
// const prevChildren = [h("div", { key: "C" }, "C"), h("div", { key: "D" }, "D")];
// const nextChildren = [
//   h("div", { key: "A" }, "A"),
//   h("div", { key: "B" }, "B"),
//   h("div", { key: "C" }, "C"),
//   h("div", { key: "D" }, "D"),
// ];

/**
 * 4 老的比新的节点长 -> 删除
 * 4.1 左侧
 * a b (c)
 * a b
 */
// const prevChildren = [
//   h("div", { key: "A" }, "A"),
//   h("div", { key: "B" }, "B"),
//   h("div", { key: "C" }, "C"),
// ];
// const nextChildren = [h("div", { key: "A" }, "A"), h("div", { key: "B" }, "B")];

/**
 * 4.2 右侧
 * (a) b c
 * b c
 */
// const prevChildren = [
//   h("div", { key: "A1" }, "A1"),
//   h("div", { key: "A" }, "A"),
//   h("div", { key: "B" }, "B"),
//   h("div", { key: "C" }, "C"),
// ];
// const nextChildren = [h("div", { key: "B" }, "B"), h("div", { key: "C" }, "C")];

// 5. 对比中间的部分
// 5.1
// a b (c d) f g
// a b (e c) f g
// d 节点 -> 删除
// c 节点 -> 更新 props
// const prevChildren = [
//   h("p", { key: "A" }, "A"),
//   h("p", { key: "B" }, "B"),
//   h("p", { key: "C", id: "c-prev" }, "C"),
//   h("p", { key: "D" }, "D"),
//   h("p", { key: "F" }, "F"),
//   h("p", { key: "G" }, "G"),
// ];

// const nextChildren = [
//   h("p", { key: "A" }, "A"),
//   h("p", { key: "B" }, "B"),
//   h("p", { key: "E" }, "E"),
//   h("p", { key: "C", id: "c-next" }, "C"),
//   h("p", { key: "F" }, "F"),
//   h("p", { key: "G" }, "G"),
// ];

// 5.2 移动 (节点存在于新的和老的里面，但是位置变了)
// 5.2.1
// a b (c d e) f g
//     [0,1,2]
// a b (e c d) f g
//     [2,0,1]
// 最长递增子序列的索引： [1,2]
// const prevChildren = [
//   h("p", { key: "A" }, "A"),
//   h("p", { key: "B" }, "B"),
//   h("p", { key: "C" }, "C"),
//   h("p", { key: "D" }, "D"),
//   h("p", { key: "E" }, "E"),
//   h("p", { key: "F" }, "F"),
//   h("p", { key: "G" }, "G"),
// ];

// const nextChildren = [
//   h("p", { key: "A" }, "A"),
//   h("p", { key: "B" }, "B"),
//   h("p", { key: "E" }, "E"),
//   h("p", { key: "C" }, "C"),
//   h("p", { key: "D" }, "D"),
//   h("p", { key: "F" }, "F"),
//   h("p", { key: "G" }, "G"),
// ];

// 5.3 创建新的节点
// a b (c e) f g
// a b (e c d) f g
// const prevChildren = [
//   h("p", { key: "A" }, "A"),
//   h("p", { key: "B" }, "B"),
//   h("p", { key: "C" }, "C"),
//   h("p", { key: "E" }, "E"),
//   h("p", { key: "F" }, "F"),
//   h("p", { key: "G" }, "G"),
// ];

// const nextChildren = [
//   h("p", { key: "A" }, "A"),
//   h("p", { key: "B" }, "B"),
//   h("p", { key: "E" }, "E"),
//   h("p", { key: "C" }, "C"),
//   h("p", { key: "D" }, "D"),
//   h("p", { key: "F" }, "F"),
//   h("p", { key: "G" }, "G"),
// ];

// 5.4 综合例子
// a b (c d e z) f g
// a b (d c y e) f g
const prevChildren = [
  h("p", { key: "A" }, "A"),
  h("p", { key: "B" }, "B"),
  h("p", { key: "C" }, "C"),
  h("p", { key: "D" }, "D"),
  h("p", { key: "E" }, "E"),
  h("p", { key: "Z" }, "Z"),
  h("p", { key: "F" }, "F"),
  h("p", { key: "G" }, "G"),
];

const nextChildren = [
  h("p", { key: "A" }, "A"),
  h("p", { key: "B" }, "B"),
  h("p", { key: "D" }, "D"),
  h("p", { key: "C" }, "C"),
  h("p", { key: "Y" }, "Y"),
  h("p", { key: "E" }, "E"),
  h("p", { key: "F" }, "F"),
  h("p", { key: "G" }, "G"),
];

export default {
  name: "ArrayToText",
  setup() {
    const isChange = ref(false);
    window.isChange = isChange;
    return {
      isChange,
    };
  },
  render() {
    return this.isChange === true
      ? h("div", {}, nextChildren)
      : h("div", {}, prevChildren);
  },
};
