import { cache } from "react";
import { db } from "@/server/db/client";

export const hasPermission = async (
  userId: string,
  permissionKey: string
): Promise<boolean> => {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });

  if (!user) return false;

  const override = await db.userPermissionOverride.findFirst({
    where: {
      userId,
      permission: { key: permissionKey },
    },
  });

  if (override !== null) {
    return override.granted;
  }

  const rolePermissions = await db.rolePermission.findMany({
    where: {
      roleId: user.roleId,
      permission: { key: permissionKey },
    },
  });

  return rolePermissions.length > 0;
};

export const getPermissionsForUser = cache(
  async (userId: string): Promise<string[]> => {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
        permissionOverrides: {
          include: { permission: true },
        },
      },
    });

    if (!user) return [];

    const rolePermKeys = user.role.permissions.map(
      (rp: any) => rp.permission.key
    );

    const permSet = new Set(rolePermKeys);

    for (const override of user.permissionOverrides) {
      if (override.granted) {
        permSet.add(override.permission.key);
      } else {
        permSet.delete(override.permission.key);
      }
    }

    return Array.from(permSet);
  }
);
