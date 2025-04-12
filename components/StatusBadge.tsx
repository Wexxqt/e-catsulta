import clsx from "clsx";
import Image from "next/image";

import { StatusIcon } from "@/constants";
import { Status } from "@/types/appwrite.types";

export const StatusBadge = ({ status }: { status: Status }) => {
  return (
    <div
      className={clsx("status-badge", {
        "bg-green-100": status === "scheduled",
        "bg-blue-100": status === "pending",
        "bg-red-100": status === "cancelled",
      })}
    >
      <Image
        src={StatusIcon[status]}
        alt="status"
        width={24}
        height={24}
        className="h-fit w-3"
      />
      <p
        className={clsx("text-12-semibold capitalize", {
          "text-green-600": status === "scheduled",
          "text-blue-600": status === "pending",
          "text-red-600": status === "cancelled",
        })}
      >
        {status}
      </p>
    </div>
  );
};
