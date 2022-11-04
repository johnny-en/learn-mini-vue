import { h, ref } from "../../lib/mini-vue.esm.js";

export const App = {
  render() {
    return h(
      "div",
      {
        id: "root",
      },
      [
        h("div", null, "count:" + this.count),
        h(
          "button",
          {
            onClick: this.onClick,
          },
          "click"
        ),
      ]
    );
  },
  setup() {
    const count = ref(0);

    const onClick = () => {
      console.log(count.value);
      count.value++;
    };
    return {
      count,
      onClick,
    };
  },
};
