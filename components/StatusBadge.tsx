import clsx from "clsx";
import {
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  Hourglass,
  AlertTriangle,
} from "lucide-react";

import { Status } from "@/types/appwrite.types";

export const StatusBadge = ({ status }: { status: Status }) => {
  // Get the appropriate icon based on status
  const getStatusIcon = () => {
    switch (status) {
      case "scheduled":
        return <Calendar className="h-4 w-4 text-green-700" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-blue-700" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-700" />;
      case "pending":
        return <AlertTriangle className="h-4 w-4 text-rose-700" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Get the badge label
  const getStatusLabel = () => {
    switch (status) {
      case "scheduled":
        return "Scheduled";
      case "completed":
        return "Completed";
      case "cancelled":
        return "Cancelled";
      case "pending":
        return "Pending";
      default:
        return status;
    }
  };

  return (
    <div
      className={clsx(
        "status-badge flex items-center rounded-full px-2.5 py-1.5 text-xs font-medium shadow-sm",
        {
          "bg-green-100 border-2 border-green-400": status === "scheduled",
          "bg-blue-100 border-2 border-blue-400": status === "completed",
          "bg-red-100 border-2 border-red-400": status === "cancelled",
          "bg-amber-100 border-2 border-amber-400": status === "pending",
        }
      )}
    >
      {getStatusIcon()}
      <p
        className={clsx("ml-1.5 font-bold", {
          "text-green-800": status === "scheduled",
          "text-blue-800": status === "completed",
          "text-red-800": status === "cancelled",
          "text-amber-800": status === "pending",
        })}
      >
        {getStatusLabel()}
      </p>
    </div>
  );
};
