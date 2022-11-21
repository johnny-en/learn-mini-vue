import { h } from "../../dist/guide-mini-vue.esm.js";
export const App = {
  setup() {
    return {
      text: "hello vue",
      x: 100,
      y: 200,
      style: {
        fontSize: 80,
        fill: "white",
      },
    };
  },
  render() {
    return h("text", {
      text: this.text,
      x: this.x,
      y: this.y,
      style: this.style,
    });
  },
};
