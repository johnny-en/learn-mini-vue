import { h } from "../../dist/guide-mini-vue.esm.js";

export const App = {
  // template
  render() {
    window.self = this;
    return h(
      "div",
      {
        id: "root",
        class: ["skyblue", "root"],
        onClick(e) {
          console.log("click", e);
        },
        onMouseup() {
          console.log("mouseup");
        },
      },
      `hello ${this.msg}`
    );
  },
  setup() {
    const msg = "mini-vue";
    return {
      msg,
    };
  },
};
