import { add } from "../index";
it("init", () => {
  expect(true).toBe(true);
});

it("add 1 + 2 equal to 3", () => {
  expect(add(1, 2)).toBe(3);
});
