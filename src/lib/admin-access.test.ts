import { describe, expect, test } from "bun:test";
import { adminAccess } from "./admin-access";

describe("admin entry access", () => {
  test("never shows the dashboard while roles load", () => {
    expect(adminAccess(true, "user-id", true)).toBe("loading");
  });
  test("a signed-out visitor must log in even with a stale admin value", () => {
    expect(adminAccess(false, null, true)).toBe("login");
  });
  test("a signed-in non-admin is denied", () => {
    expect(adminAccess(false, "user-id", false)).toBe("denied");
  });
  test("a loaded, signed-in admin may enter", () => {
    expect(adminAccess(false, "user-id", true)).toBe("admin");
  });
});