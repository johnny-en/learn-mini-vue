import { ref } from "../../lib/mini-vue.esm.js";

export const App = {
  name: "App",
  template: `<div>hello,{{message}}</div>`,
  setup() {
    const message = (window.message = ref("mini-vue"));
    return {
      message,
    };
  },
};
