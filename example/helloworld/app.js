import { h } from "../../lib/mini-vue.esm.js";

export const App = {
  // template
  render() {
    return h(
      "div",
      {
        id: "root",
        class: ["skyblue", "root"],
      },
      `hello ${this.msg}`
      // [h("p", { class: "skyblue" }, "hello"), h("p", null, "mini vue")]
    );
  },
  setup() {
    const msg = "mini-vue";
    return {
      msg,
    };
  },
};
