import { describe, it, expect, vi, beforeEach } from "vitest";
import { hasPermission } from "../check";

vi.mock("@/server/db/client", () => ({
  db: {
    rolePermission: {
      findMany: vi.fn(),
    },
    userPermissionOverride: {
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import { db } from "@/server/db/client";

const mockDb = vi.mocked(db);

describe("hasPermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when role has the permission", async () => {
    mockDb.user.findUnique.mockResolvedValue({
      id: "user1",
      roleId: "role1",
    } as any);

    mockDb.rolePermission.findMany.mockResolvedValue([
      { roleId: "role1", permissionId: "perm1" },
    ] as any);

    mockDb.userPermissionOverride.findFirst.mockResolvedValue(null);

    const result = await hasPermission("user1", "users.approve");
    expect(result).toBe(true);
  });

  it("returns false when role lacks the permission and no override", async () => {
    mockDb.user.findUnique.mockResolvedValue({
      id: "user1",
      roleId: "role1",
      role: { name: "student" },
    } as any);

    mockDb.rolePermission.findMany.mockResolvedValue([]);
    mockDb.userPermissionOverride.findFirst.mockResolvedValue(null);

    const result = await hasPermission("user1", "users.approve");
    expect(result).toBe(false);
  });

  it("override granted=true overrides role denial", async () => {
    mockDb.user.findUnique.mockResolvedValue({
      id: "user1",
      roleId: "role1",
      role: { name: "student" },
    } as any);

    mockDb.rolePermission.findMany.mockResolvedValue([]);
    mockDb.userPermissionOverride.findFirst.mockResolvedValue({
      granted: true,
    } as any);

    const result = await hasPermission("user1", "users.approve");
    expect(result).toBe(true);
  });

  it("override granted=false overrides role permission", async () => {
    mockDb.user.findUnique.mockResolvedValue({
      id: "user1",
      roleId: "role1",
      role: { name: "admin" },
    } as any);

    mockDb.rolePermission.findMany.mockResolvedValue([
      { roleId: "role1", permissionId: "p1" },
    ] as any);

    mockDb.userPermissionOverride.findFirst.mockResolvedValue({
      granted: false,
    } as any);

    const result = await hasPermission("user1", "users.approve");
    expect(result).toBe(false);
  });
});
