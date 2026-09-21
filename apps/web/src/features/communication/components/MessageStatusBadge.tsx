import type { CommunicationMessageStatus } from "../types/communication.types";

interface MessageStatusBadgeProps {
  status: CommunicationMessageStatus;
}

export function MessageStatusBadge({ status }: MessageStatusBadgeProps) {
  const getStatusColor = (status: CommunicationMessageStatus) => {
    switch (status) {
      case "queued":
      case "sending":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      case "sent":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "delivered":
      case "read":
      case "received":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "failed":
      case "bounced":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getStatusLabel = (status: CommunicationMessageStatus) => {
    switch (status) {
      case "queued": return "Queued";
      case "sending": return "Sending";
      case "sent": return "Sent";
      case "delivered": return "Delivered";
      case "read": return "Read";
      case "received": return "Received";
      case "failed": return "Failed";
      case "bounced": return "Bounced";
      default: return status;
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
        status,
      )}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}
