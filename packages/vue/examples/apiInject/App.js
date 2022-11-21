import { h, provide, inject } from "../../dist/guide-mini-vue.esm.js";

const Provider = {
  name: "Provider",
  setup() {
    provide("foo", "fooVal");
    provide("bar", "barVal");
  },
  render() {
    return h("div", {}, [h("p", {}, "Provider"), h(ProviderTwo)]);
  },
};

const ProviderTwo = {
  name: "ProviderTwo",
  setup() {
    provide("bar", "barValTwo");
    const bar = inject("bar");
    return {
      bar,
    };
  },
  render() {
    return h("div", {}, [
      h("p", {}, `ProviderTwo - parent Provider: Bar - ${this.bar}`),
      h(Consumer),
    ]);
  },
};

const Consumer = {
  name: "Consumer",
  setup() {
    const foo = inject("foo");
    const bar = inject("bar");
    const baz = inject("baz", () => "bazVal");
    // const baz = inject("baz", "bazVal");

    return {
      foo,
      bar,
      baz,
    };
  },
  render() {
    return h("div", {}, [
      h(
        "p",
        null,
        `Consumer - parent ProviderTwo: Foo - ${this.foo} & Bar - ${this.bar}`
      ),
      h("p", null, `Consumer - inject second parameter: ${this.baz}`),
    ]);
  },
};

export const App = {
  setup() {},
  render() {
    return h("div", {}, [h("p", {}, "apiInject"), h(Provider)]);
  },
};
