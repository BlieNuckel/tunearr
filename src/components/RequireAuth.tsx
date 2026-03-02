import { Outlet } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import SetupPage from "@/pages/SetupPage/SetupPage";
import LoginPage from "@/pages/LoginPage/LoginPage";

export default function RequireAuth() {
  const { status } = useAuth();

  if (status === "loading") return null;
  if (status === "needs-setup") return <SetupPage />;
  if (status === "unauthenticated") return <LoginPage />;

  return <Outlet />;
}
