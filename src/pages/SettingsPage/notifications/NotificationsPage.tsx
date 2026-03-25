import { Outlet } from "react-router-dom";
import NotificationsLayout from "./NotificationsLayout";

export default function NotificationsPage() {
  return (
    <NotificationsLayout>
      <Outlet />
    </NotificationsLayout>
  );
}
