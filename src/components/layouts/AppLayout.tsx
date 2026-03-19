import { DashboardHeader } from "@/components/ui/dashboard-header";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <>
      <DashboardHeader />
      <Outlet />
    </>
  );
}
