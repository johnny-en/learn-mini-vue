export const App = {
  // template
  render() {
    return h("div", `hello ${this.msg}`);
  },
  setup() {
    const msg = "mini-vue";
    return {
      msg,
    };
  },
};
