import { h, ref } from "../../lib/mini-vue.esm.js";
export default {
  name: "Child",
  setup(props, { emit }) {
    // const count = ref(1);
    // const onClick = () => {
    //   count.value--;
    // };
    // return { count, onClick };
  },
  render() {
    return h("div", { onClick: this.onClick }, [
      h("p", {}, `child props msg: ${this.$props.msg}`),
    ]);
  },
};
