import { describe, expect, it } from "vitest";
import { deleteAssignment } from "@/lib/assignments/actions";

describe("PACK-002 no hard-delete path", () => {
  it("deleteAssignment always returns FORBIDDEN", async () => {
    const result = await deleteAssignment();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("FORBIDDEN");
      expect(result.error.httpStatus).toBe(403);
    }
  });
});
