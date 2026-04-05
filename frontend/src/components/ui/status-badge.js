import { memo } from "react";

const statusMap = {
  ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  INACTIVE: "bg-slate-100 text-slate-700 border-slate-200",
  PAID: "bg-emerald-100 text-emerald-800 border-emerald-200",
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  FAILED: "bg-red-100 text-red-800 border-red-200"
};

function StatusBadge({ status }) {
  const style =
    statusMap[status] ?? "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] shadow-sm backdrop-blur ${style}`}
    >
      {status}
    </span>
  );
}

export default memo(StatusBadge);
