import React from "react";
import StatsGrid from "./stats";
import QuickActions from "./quickActions";
import RecentInvoices from "./recentInvoices";
import ComplaincesAlert from "./complaincesAlert";
export default function Index() {
  return (
    <div>
      <StatsGrid />
      <QuickActions />
      <RecentInvoices />
      <ComplaincesAlert />
    </div>
  );
}
