import { NotificationsView } from "@/features/notifications/components/notifications-view";
import { getNotifications } from "@/features/notifications/queries/get-notifications";

export default async function NotificationsPage() {
  const result = await getNotifications();
  return <NotificationsView notifications={result.notifications} configured={result.configured} />;
}
