import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
import { adminAccess } from "./admin-access";

describe("admin entry access", () => {
  test("never shows the dashboard while roles load", () => {
    assert.equal(adminAccess(true, "user-id", true), "loading");
  });
  test("a signed-out visitor must log in even with a stale admin value", () => {
    assert.equal(adminAccess(false, null, true), "login");
  });
  test("a signed-in non-admin is denied", () => {
    assert.equal(adminAccess(false, "user-id", false), "denied");
  });
  test("a loaded, signed-in admin may enter", () => {
    assert.equal(adminAccess(false, "user-id", true), "admin");
  });
});