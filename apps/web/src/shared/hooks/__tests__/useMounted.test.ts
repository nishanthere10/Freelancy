import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useMounted } from "../useMounted";

describe("useMounted", () => {
  it("returns true after mount", () => {
    const { result } = renderHook(() => useMounted());
    expect(result.current).toBe(true);
  });

  it("prevents hydration mismatch by tracking mount state", () => {
    const { result, rerender } = renderHook(() => useMounted());
    expect(result.current).toBe(true);

    rerender();
    expect(result.current).toBe(true);
  });
});
