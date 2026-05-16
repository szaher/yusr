import { Badge } from "@/components/ui/badge";

const statusColors: Record<string, string> = {
  PENDING_REVIEW: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  WAITLISTED: "bg-blue-100 text-blue-800",
  ACTIVE: "bg-green-100 text-green-800",
  DEACTIVATED: "bg-gray-100 text-gray-800",
  BANNED: "bg-red-100 text-red-800",
  EXPELLED: "bg-red-100 text-red-800",
};

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={statusColors[status] ?? "bg-gray-100 text-gray-800"}
    >
      {label ?? status}
    </Badge>
  );
}
