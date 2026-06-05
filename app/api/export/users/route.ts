import { auth } from "@/server/auth/config";
import { hasPermission, Permissions } from "@/server/permissions";
import { getAllUsers } from "@/server/services/user";
import { generateCsv } from "@/server/lib/csv";

export async function GET() {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const allowed = await hasPermission(session.user.id, Permissions.USERS_LIST);
  if (!allowed) return new Response("Forbidden", { status: 403 });

  const { items: users } = await getAllUsers(1, 10000);

  const headers = ["Name", "Name (AR)", "Email", "Role", "Status", "Created At"];
  const rows = users.map((u) => [
    u.name,
    u.nameAr || "",
    u.email,
    u.role?.name || "",
    u.accountStatus || "ACTIVE",
    u.createdAt.toISOString().split("T")[0],
  ]);

  const csv = generateCsv(headers, rows);
  const date = new Date().toISOString().split("T")[0];

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="users-${date}.csv"`,
    },
  });
}
