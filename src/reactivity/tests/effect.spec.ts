import { effect } from "../effect";
import { reactive } from "../reactive";

describe("effect", () => {
  it("happy path", () => {
    const user = reactive({
      age: 10,
    });
    let nextAge = 0;
    effect(() => {
      nextAge = user.age + 1;
    });
    expect(nextAge).toBe(11);

    // update
    user.age++;
    expect(nextAge).toBe(12);
  });

  it("调用 effect 返回 runner 函数", () => {
    let foo = 10;
    const runner = effect(() => {
      foo++;
      return "foo";
    });

    expect(foo).toBe(11);
    const run = runner();
    expect(foo).toBe(12);
    expect(run).toBe("foo");
  });

  it("scheduler", () => {
    /**
     * 1. effect 的第二个参数：{ scheduler: function }
     * 2. effect 第一次会执行第一个参数 fn
     * 3. 当响应式数据更新时，不会执行第一个参数 fn，面是执行scheduler
     * 4. 当执行 runner 后，会再次执行第一个参数 fn
     */
    let dummy;
    let run;
    const scheduler = jest.fn(() => {
      run = runner;
    });
    const obj = reactive({ foo: 1 });
    const runner = effect(
      () => {
        dummy = obj.foo;
      },
      {
        scheduler,
      }
    );

    expect(scheduler).not.toHaveBeenCalled();
    expect(dummy).toBe(1);

    obj.foo++;
    expect(scheduler).toHaveBeenCalledTimes(1);
    expect(dummy).toBe(1);

    run();
    expect(dummy).toBe(2);
  });
});
