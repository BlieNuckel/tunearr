import { Navigate } from "react-router-dom";
import useIsMobile from "@/hooks/useIsMobile";

type ConditionalRedirectProps = {
  to: string;
};

export default function ConditionalRedirect({ to }: ConditionalRedirectProps) {
  const isMobile = useIsMobile();

  if (isMobile) return null;

  return <Navigate to={to} replace />;
}
