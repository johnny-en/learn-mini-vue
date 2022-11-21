import {
  h,
  ref,
  getCurrentInstance,
  nextTick,
} from "../../dist/guide-mini-vue.esm.js";

export const App = {
  name: "App",
  render() {
    return h("div", {}, [
      h("button", { onClick: this.onClick }, "update"),
      h("p", {}, `count:${this.count}`),
    ]);
  },
  setup() {
    const count = ref(0);
    const instance = getCurrentInstance();

    const onClick = async () => {
      for (let i = 0; i < 3; i++) {
        console.log("update i = " + i);
        count.value = i;
      }
      console.log(instance);
      nextTick(() => {
        console.log("nextTick", instance);
      });

      // await nextTick();
      // console.log(instance);
    };

    return {
      count,
      onClick,
    };
  },
};
