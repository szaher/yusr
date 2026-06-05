import { cache } from "react";
import { db } from "@/server/db/client";

export const hasPermission = async (
  userId: string,
  permissionKey: string
): Promise<boolean> => {
  const permissions = await getPermissionsForUser(userId);
  return permissions.includes(permissionKey);
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
