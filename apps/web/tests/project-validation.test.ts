import { describe, expect, it } from "vitest";

import {
  hasProjectFieldErrors,
  normalizeProjectForm,
  validateProjectForm,
} from "@/lib/projects/validation";

describe("validateProjectForm", () => {
  it("requires a name and valid type", () => {
    const errors = validateProjectForm({
      name: "   ",
      description: "",
      projectType: "unknown",
    });
    expect(errors.name).toMatch(/required/i);
    expect(errors.projectType).toMatch(/valid project type/i);
    expect(hasProjectFieldErrors(errors)).toBe(true);
  });

  it("enforces length limits", () => {
    const errors = validateProjectForm({
      name: "a".repeat(121),
      description: "b".repeat(2001),
      projectType: "document",
    });
    expect(errors.name).toMatch(/120/);
    expect(errors.description).toMatch(/2000/);
  });

  it("normalises a valid project payload", () => {
    const normalized = normalizeProjectForm({
      name: "  Leadership Course  ",
      description: "  From the book manuscript  ",
      projectType: "course",
    });
    expect(normalized).toEqual({
      name: "Leadership Course",
      description: "From the book manuscript",
      projectType: "course",
    });
  });

  it("stores blank descriptions as null", () => {
    const normalized = normalizeProjectForm({
      name: "Sermon Clips",
      description: "   ",
      projectType: "video",
    });
    expect(normalized?.description).toBeNull();
  });
});
