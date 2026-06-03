import { describe, it, expect, vi } from "vitest";
import { runDashboardMutation } from "./dashboard-actions";

describe("runDashboardMutation", () => {
  it("runs begin, mutation, refresh, and end in order", async () => {
    const events: string[] = [];

    await runDashboardMutation({
      begin: () => events.push("begin"),
      end: () => events.push("end"),
      refresh: () => events.push("refresh"),
      mutate: async () => {
        events.push("mutate");
      },
    });

    expect(events).toEqual(["begin", "mutate", "refresh", "end"]);
  });

  it("still ends the loading state if the mutation fails", async () => {
    const begin = vi.fn();
    const end = vi.fn();
    const refresh = vi.fn();

    await expect(
      runDashboardMutation({
        begin,
        end,
        refresh,
        mutate: async () => {
          throw new Error("boom");
        },
      })
    ).rejects.toThrow("boom");

    expect(begin).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
  });
});
