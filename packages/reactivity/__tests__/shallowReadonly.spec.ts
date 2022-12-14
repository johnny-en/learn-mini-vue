import { isReadonly, shallowReadonly } from "../src/reactive";
import { vi } from "vitest";

describe("shallowReadonly", () => {
  it("happy path", () => {
    const observed = shallowReadonly({ n: { foo: 1 } });
    expect(isReadonly(observed)).toBe(true);
    expect(isReadonly(observed.n)).toBe(false);
  });

  it("warn then call set", () => {
    console.warn = vi.fn();

    const user = shallowReadonly({
      age: 10,
    });
    user.age = 11;

    expect(console.warn).toBeCalled();
  });
});
