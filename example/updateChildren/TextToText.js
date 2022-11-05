import { ref, h } from "../../lib/mini-vue.esm.js";

const prevChildren = "oldChildren";
const nextChildren = "newChildren";

export default {
  name: "TextToText",
  setup() {
    const isChange = ref(false);
    window.textToText = isChange;
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
