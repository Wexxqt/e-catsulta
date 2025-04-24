import clsx from "clsx";
import Image from "next/image";
import { Clock } from "lucide-react";

import { Status } from "@/types/appwrite.types";

export const StatusBadge = ({ status }: { status: Status }) => {
  // Get the appropriate icon based on status
  const getStatusIcon = () => {
    switch (status) {
      case "scheduled":
        return (
          <div className="h-4 w-4 relative">
            <Image
              src="/assets/icons/scheduled.svg"
              alt="scheduled"
              fill
              className="object-contain"
            />
          </div>
        );
      case "completed":
        return (
          <div className="h-4 w-4 relative">
            <Image
              src="/assets/icons/check.svg"
              alt="completed"
              fill
              className="object-contain"
            />
          </div>
        );
      case "cancelled":
        return (
          <div className="h-4 w-4 relative">
            <Image
              src="/assets/icons/cancelled.svg"
              alt="cancelled"
              fill
              className="object-contain"
            />
          </div>
        );
      case "pending":
        return (
          <div className="h-4 w-4 relative">
            <Image
              src="/assets/icons/today.svg"
              alt="pending"
              fill
              className="object-contain"
            />
          </div>
        );
      case "missed":
        return (
          <div className="h-4 w-4 relative">
            <Image
              src="/assets/icons/missed.svg"
              alt="missed"
              fill
              className="object-contain"
            />
          </div>
        );
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
      case "missed":
        return "Missed";
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
          "bg-purple-100 border-2 border-purple-400": status === "missed",
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
          "text-purple-800": status === "missed",
        })}
      >
        {getStatusLabel()}
      </p>
    </div>
  );
};
