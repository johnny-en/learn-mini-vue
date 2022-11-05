import { ref, h } from "../../lib/mini-vue.esm.js";

const prevChildren = "newChildren";
const nextChildren = [h("div", {}, "A"), h("div", {}, "B")];

export default {
  name: "TextToArray",
  setup() {
    const isChange = ref(false);
    window.textToArrayChange = isChange;
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
