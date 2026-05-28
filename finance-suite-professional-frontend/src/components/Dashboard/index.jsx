import React from "react";
import StatsGrid from "./stats";
import QuickActions from "./quickActions";
import RecentInvoices from "./recentInvoices";
import ComplaincesAlert from "./complaincesAlert";
import GstSummaryCard from "./GstSummaryCard";
import TdsSummaryCard from "./TdsSummaryCard";
import DashboardGraphs from "./DashboardGraphs";
export default function Index() {
  return (
    <div>
      <StatsGrid />
      {/* <DashboardGraphs /> */}
      <QuickActions />
      <GstSummaryCard />
      <TdsSummaryCard />
      <RecentInvoices />
      <ComplaincesAlert />
    </div>
  );
}
