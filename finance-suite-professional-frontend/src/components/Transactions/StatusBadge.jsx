import React from "react";
import { STATUS_META } from "./constants";

const StatusBadge = React.memo(function StatusBadge({ value }) {
  const m = STATUS_META[value] ?? STATUS_META.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
});

export default StatusBadge;
