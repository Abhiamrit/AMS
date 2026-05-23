import React, { useState } from "react";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

/**
 * AssignmentTimeline
 *
 * Props:
 *   routing       — array from GET /api/assignments/:id/routing
 *   sectionTables — array from GET /api/routing/assignment/:id/tables
 *   isUnderReview — boolean, show "send back" button on DONE steps
 *   onSendBack    — (routingStep) => void, called when send-back is clicked
 */
export default function AssignmentTimeline({
  routing = [],
  sectionTables = [],
  isUnderReview = false,
  onSendBack,
}) {
  const [expanded, setExpanded] = useState({}); // routing_id -> bool

  const toggle = (rid) =>
    setExpanded((prev) => ({ ...prev, [rid]: !prev[rid] }));

  const formatDT = (s) =>
    s
      ? new Date(s.includes("Z") ? s : s + "Z").toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })
      : "—";

  const stepIcon = (status) => {
    if (status === "DONE")
      return <CheckCircle size={20} className="text-emerald-500" />;
    if (status === "IN PROGRESS")
      return <Clock size={20} className="text-indigo-500 animate-pulse" />;
    if (status === "SENT BACK")
      return <AlertCircle size={20} className="text-red-500" />;
    return <Clock size={20} className="text-gray-300" />;
  };

  const stepBorder = (status) => {
    if (status === "DONE") return "border-emerald-200 bg-emerald-50";
    if (status === "IN PROGRESS") return "border-indigo-200 bg-indigo-50";
    if (status === "SENT BACK") return "border-red-200 bg-red-50";
    return "border-gray-200 bg-gray-50";
  };

  const statusLabel = (status) => {
    const map = {
      DONE: "bg-emerald-100 text-emerald-700",
      "IN PROGRESS": "bg-indigo-100 text-indigo-700",
      "SENT BACK": "bg-red-100 text-red-700",
      WAITING: "bg-gray-100 text-gray-500",
    };
    return (
      <span
        className={`text-xs font-semibold px-2 py-0.5 rounded ${map[status] || "bg-gray-100 text-gray-500"}`}
      >
        {status}
      </span>
    );
  };

  if (routing.length === 0) return null;

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-navy-800 mb-4">Routing Timeline</h3>
      <div className="space-y-3">
        {routing.map((step, idx) => {
          const tableForStep = sectionTables.find(
            (t) => t.routing_id === step.routing_id,
          );
          const isOpen = expanded[step.routing_id];

          return (
            <div
              key={step.routing_id}
              className={`rounded-lg border ${stepBorder(step.status)}`}
            >
              {/* Step header */}
              <div className="flex gap-3 p-4">
                <div className="flex-shrink-0 mt-0.5">
                  {stepIcon(step.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="font-medium text-navy-800 text-sm">
                      Step {idx + 1}: {step.section_name}
                    </div>
                    <div className="flex items-center gap-2">
                      {statusLabel(step.status)}
                      {/* Expand/collapse if there's a table */}
                      {tableForStep && tableForStep.columns?.length > 0 && (
                        <button
                          onClick={() => toggle(step.routing_id)}
                          className="text-xs text-navy-500 hover:text-navy-700 flex items-center gap-0.5"
                        >
                          {isOpen ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                          {isOpen ? "Hide data" : "View data"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Meta info */}
                  <div className="mt-1 space-y-0.5">
                    {step.assigned_to_name && (
                      <div className="text-xs text-gray-500">
                        Assigned to:{" "}
                        <span className="font-medium">
                          {step.assigned_to_name}
                        </span>
                      </div>
                    )}
                    {step.assigned_by_name && (
                      <div className="text-xs text-gray-400">
                        Assigned by: {step.assigned_by_name}
                      </div>
                    )}
                    {step.assigned_at && (
                      <div className="text-xs text-gray-400">
                        Assigned on: {formatDT(step.assigned_at)}
                      </div>
                    )}
                    {step.completed_at && (
                      <div className="text-xs text-gray-400">
                        Completed: {formatDT(step.completed_at)}
                      </div>
                    )}
                    {step.notes && (
                      <div className="text-xs text-gray-600 mt-1 italic">
                        Notes: {step.notes}
                      </div>
                    )}
                    {step.sent_back_reason && (
                      <div className="text-xs text-red-600 mt-1">
                        Sent back reason: {step.sent_back_reason}
                      </div>
                    )}
                  </div>

                  {/* Send back link */}
                  {isUnderReview && step.status === "DONE" && onSendBack && (
                    <button
                      className="mt-2 text-xs text-red-500 hover:text-red-700 underline"
                      onClick={() => onSendBack(step)}
                    >
                      Send back to this section
                    </button>
                  )}

                  {/* No table submitted note */}
                  {(step.status === "DONE" || step.status === "SENT BACK") &&
                    !tableForStep && (
                      <div className="mt-2 text-xs text-gray-400 italic">
                        No data table submitted by this section.
                      </div>
                    )}
                </div>
              </div>

              {/* Expanded section data table */}
              {isOpen && tableForStep && tableForStep.columns?.length > 0 && (
                <div className="px-4 pb-4">
                  <div className="overflow-x-auto rounded-lg border border-navy-200">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="bg-navy-700">
                          <th className="px-3 py-2 text-left text-white font-medium">
                            #
                          </th>
                          {tableForStep.columns.map((col) => (
                            <th
                              key={col.column_id}
                              className="px-3 py-2 text-left text-white font-medium"
                            >
                              {col.column_name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableForStep.rows.length === 0 && (
                          <tr>
                            <td
                              colSpan={tableForStep.columns.length + 1}
                              className="text-center py-4 text-gray-400"
                            >
                              No data rows.
                            </td>
                          </tr>
                        )}
                        {tableForStep.rows.map((row, ri) => (
                          <tr
                            key={row.row_id}
                            className={ri % 2 === 0 ? "bg-white" : "bg-navy-50"}
                          >
                            <td className="px-3 py-2 text-gray-400">
                              {ri + 1}
                            </td>
                            {tableForStep.columns.map((col) => (
                              <td
                                key={col.column_id}
                                className="px-3 py-2 text-gray-700 border-l border-navy-100"
                              >
                                {row.cells[col.column_id] ?? ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
