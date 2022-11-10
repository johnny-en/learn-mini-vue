import { h, ref } from "../../lib/mini-vue.esm.js";

import Child from "./Child.js";

export const App = {
  name: "App",
  render() {
    return h("div", {}, [
      h("p", {}, "hello"),
      h(
        "button",
        {
          onClick: this.changeChildProps,
        },
        "change child props"
      ),
      h(Child, {
        msg: this.msg,
      }),
      h(
        "button",
        {
          onClick: this.changeCount,
        },
        "change self count"
      ),
      h("p", {}, `count: ${this.count}`),
    ]);
  },
  setup() {
    const msg = ref("haha");
    const count = ref(1);

    window.msg = msg;

    const changeChildProps = () => {
      msg.value = "xixi";
    };

    const changeCount = () => {
      count.value++;
    };
    return {
      msg,
      count,
      changeChildProps,
      changeCount,
    };
  },
};
