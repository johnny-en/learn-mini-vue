import { reactive } from "../reactive";
import { computed } from "../computed";

describe("computed", () => {
  it("happy path", () => {
    const user = reactive({
      age: 1,
    });

    const age = computed(() => {
      return user.age;
    });

    expect(age.value).toBe(1);
  });

  it("should compute lazily", () => {
    const obj = reactive({
      foo: 1,
    });

    const getter = jest.fn(() => {
      return obj.foo;
    });
    const foo = computed(getter);

    // lazy
    expect(getter).not.toHaveBeenCalled();
    expect(foo.value).toBe(1);
    expect(getter).toHaveBeenCalledTimes(1);

    // should not compute again
    foo.value;
    expect(getter).toHaveBeenCalledTimes(1);

    // should not computed until needed
    obj.foo = 2;
    expect(getter).toHaveBeenCalledTimes(1);

    // now it should compute
    expect(foo.value).toBe(2);
    expect(getter).toHaveBeenCalledTimes(2);

    // should not computed again
    foo.value;
    expect(getter).toHaveBeenCalledTimes(2);
  });
});
