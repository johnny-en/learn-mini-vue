import { ref, h } from "../../dist/guide-mini-vue.esm.js";

const prevChildren = [h("div", {}, "A"), h("div", {}, "B")];
const nextChildren = "newChildren";

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
