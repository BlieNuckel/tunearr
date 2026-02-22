import { describe, it, expect } from "vitest";
import { AsyncLock } from "./asyncLock";

describe("AsyncLock", () => {
  it("executes the function and returns its result", async () => {
    const lock = new AsyncLock();
    const result = await lock.acquire("key1", async () => 42);
    expect(result).toBe(42);
  });

  it("serializes concurrent calls with the same key", async () => {
    const lock = new AsyncLock();
    const order: string[] = [];

    const task1 = lock.acquire("same-key", async () => {
      order.push("task1-start");
      await new Promise((r) => setTimeout(r, 50));
      order.push("task1-end");
      return "a";
    });

    const task2 = lock.acquire("same-key", async () => {
      order.push("task2-start");
      await new Promise((r) => setTimeout(r, 10));
      order.push("task2-end");
      return "b";
    });

    const [r1, r2] = await Promise.all([task1, task2]);

    expect(r1).toBe("a");
    expect(r2).toBe("b");
    expect(order).toEqual([
      "task1-start",
      "task1-end",
      "task2-start",
      "task2-end",
    ]);
  });

  it("allows concurrent calls with different keys", async () => {
    const lock = new AsyncLock();
    const order: string[] = [];

    const task1 = lock.acquire("key-a", async () => {
      order.push("a-start");
      await new Promise((r) => setTimeout(r, 50));
      order.push("a-end");
    });

    const task2 = lock.acquire("key-b", async () => {
      order.push("b-start");
      await new Promise((r) => setTimeout(r, 10));
      order.push("b-end");
    });

    await Promise.all([task1, task2]);

    // Both should start before either finishes
    expect(order.indexOf("b-start")).toBeLessThan(order.indexOf("a-end"));
  });

  it("releases the lock when the function throws", async () => {
    const lock = new AsyncLock();

    await expect(
      lock.acquire("key", async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");

    // Lock should be released — next acquire should work immediately
    const result = await lock.acquire("key", async () => "recovered");
    expect(result).toBe("recovered");
  });

  it("serializes three concurrent calls on the same key", async () => {
    const lock = new AsyncLock();
    const order: number[] = [];

    const tasks = [1, 2, 3].map((n) =>
      lock.acquire("key", async () => {
        order.push(n);
        await new Promise((r) => setTimeout(r, 10));
        return n;
      })
    );

    const results = await Promise.all(tasks);

    expect(results).toEqual([1, 2, 3]);
    expect(order).toEqual([1, 2, 3]);
  });
});
