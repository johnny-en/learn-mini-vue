import { nextTick } from "../scheduler";
import { reactive } from "../../reactivity/reactive";
import { watchEffect } from "../apiWatch";

describe("api: watch", () => {
  it("effect", async () => {
    const state = reactive({
      count: 0,
    });
    let dummy;
    watchEffect(() => {
      dummy = state.count;
    });
    expect(dummy).toBe(0);

    state.count++;
    await nextTick();
    expect(dummy).toBe(1);
  });

  it("stopping the watcher (effect)", async () => {
    const state = reactive({ count: 0 });
    let dummy;
    const stop: any = watchEffect(() => {
      dummy = state.count;
    });
    expect(dummy).toBe(0);

    stop();
    state.count++;
    await nextTick();
    expect(dummy).toBe(0);
  });

  it("cleanup registration (effect)", async () => {
    const state = reactive({ count: 0 });
    const cleanup = jest.fn(() => console.log(111));
    let dummy;
    const stop: any = watchEffect((onCleanup) => {
      onCleanup(cleanup);
      console.log(2);
      dummy = state.count;
    });
    expect(dummy).toBe(0);

    state.count++;
    expect(cleanup).toHaveBeenCalledTimes(0);
    await nextTick();
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(dummy).toBe(1);

    stop();
    expect(cleanup).toHaveBeenCalledTimes(2);
  });
});
