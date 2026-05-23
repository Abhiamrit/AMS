import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { PageHeader, Spinner } from "../../components/ui";
import AssignmentTableBuilder from "../../components/AssignmentTableBuilder";
import toast from "react-hot-toast";
import { ArrowLeft, Save, CheckCircle, Lock, AlertCircle } from "lucide-react";

// ─── Read-only table ─────────────────────────────────────────────────────────
function ReadOnlyTable({ columns, rows }) {
  if (!columns || columns.length === 0)
    return (
      <div className="text-sm text-gray-400 italic">No data submitted.</div>
    );
  return (
    <div className="overflow-x-auto rounded-lg border border-navy-200">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-navy-700">
            <th className="px-3 py-2 text-left text-white font-medium">#</th>
            {columns.map((col) => (
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
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="text-center py-4 text-gray-400"
              >
                No data rows.
              </td>
            </tr>
          )}
          {rows.map((row, ri) => (
            <tr
              key={row.row_id}
              className={ri % 2 === 0 ? "bg-white" : "bg-navy-50"}
            >
              <td className="px-3 py-2 text-gray-400">{ri + 1}</td>
              {columns.map((col) => (
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
  );
}

function LockedBanner({ label }) {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded px-3 py-2 mb-3">
      <Lock size={12} className="flex-shrink-0" />
      <span>{label}</span>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function AssignmentWork() {
  const { routingId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [routing, setRouting] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [prevTables, setPrevTables] = useState([]);
  const [tableData, setTableData] = useState({ columns: [], rows: [] });
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch routing step — works for section head OR assigned member
      let routingStep;
      try {
        const rRes = await api.get(`/routing/${routingId}`);
        routingStep = rRes.data.routing;
      } catch (err) {
        if (err.response?.status === 403 || err.response?.status === 404) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
        throw err;
      }
      setRouting(routingStep);

      // 2. Fetch assignment details + all section tables + this step's table + routing order
      const [aRes, allTablesRes, myTableRes, routingDetailsRes] =
        await Promise.all([
          api.get(`/assignments/${routingStep.assignment_id}`),
          api.get(`/routing/assignment/${routingStep.assignment_id}/tables`),
          api.get(`/routing/${routingId}/table`),
          api.get(`/assignments/${routingStep.assignment_id}/routing`),
        ]);

      setAssignment(aRes.data.assignment);

      // 3. Previous sections' tables (read-only)
      const allTables = allTablesRes.data.tables || [];
      const myStep = routingDetailsRes.data.routing.find(
        (r) => r.routing_id === parseInt(routingId),
      );
      const myOrder = myStep ? myStep.routing_order : 999;
      setPrevTables(allTables.filter((t) => t.routing_order < myOrder));

      // 4. Load my existing table
      const mine = myTableRes.data.table;
      if (mine && mine.columns && mine.columns.length > 0) {
        setTableData({ columns: mine.columns, rows: mine.rows });
        setRemarks(mine.remarks || "");
      } else {
        setTableData({ columns: [], rows: [] });
        setRemarks("");
      }
    } catch (err) {
      toast.error("Failed to load assignment data.");
    } finally {
      setLoading(false);
    }
  }, [routingId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Save table ───────────────────────────────────────────────────────────
  const buildPayload = () => ({
    columns: tableData.columns.map((col, i) => ({
      column_name: col.column_name,
      column_type: col.column_type,
      column_order: i,
      is_predefined: col.is_predefined || 0,
    })),
    rows: tableData.rows.map((row, ri) => ({
      row_order: ri,
      cells: Object.fromEntries(
        tableData.columns.map((_, i) => [i, row.cells[i] ?? ""]),
      ),
    })),
    remarks: remarks || null,
  });

  const saveTable = () =>
    api.post(`/routing/${routingId}/table`, buildPayload());

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveTable();
      toast.success("Data saved.");
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  // ── Complete ─────────────────────────────────────────────────────────────
  const handleComplete = async () => {
    setCompleting(true);
    try {
      await saveTable();
      await api.post(`/routing/${routingId}/complete`, {
        notes: remarks || null,
      });
      toast.success("Section marked as done!");
      // Section heads go to inbox; regular members go to My Work
      if (user?.is_section_head) {
        navigate("/section/inbox");
      } else {
        navigate("/section/work");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to complete.");
    } finally {
      setCompleting(false);
      setConfirmComplete(false);
    }
  };

  const fmt = (s) =>
    s
      ? new Date(s.includes("Z") ? s : s + "Z").toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })
      : "—";

  // ── Render: loading ──────────────────────────────────────────────────────
  if (loading) return <Spinner />;

  // ── Render: access denied ────────────────────────────────────────────────
  if (accessDenied)
    return (
      <div className="space-y-5">
        <PageHeader title="My Work" />
        <div className="card p-10 text-center">
          <AlertCircle size={36} className="text-red-400 mx-auto mb-3" />
          <h3 className="font-semibold text-navy-800 mb-1">Access Denied</h3>
          <p className="text-sm text-gray-500 mb-4">
            This work item is not assigned to you or belongs to a different
            section.
          </p>
          <button
            className="btn-secondary"
            onClick={() => navigate("/section/inbox")}
          >
            Back to Inbox
          </button>
        </div>
      </div>
    );

  if (!assignment || !routing) return null;

  const isDone = routing.status === "DONE";
  const isSentBack = routing.status === "SENT BACK";
  const isWaiting = routing.status === "WAITING";
  const isSectionHead =
    user?.is_section_head && user?.section_id === routing.section_id;
  const isAssignedToMe = routing.assigned_to === user?.user_id;
  // Can edit: (assigned to me OR I'm the section head) AND not done AND not waiting
  const canEdit = (isAssignedToMe || isSectionHead) && !isDone && !isWaiting;

  return (
    <div className="space-y-5">
      <PageHeader
        title={isDone ? "Section Data (View)" : "My Work"}
        subtitle={`${assignment.assignment_code} — ${assignment.assignment_name}`}
        action={
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={() => navigate("/section/inbox")}
          >
            <ArrowLeft size={16} /> Back to Inbox
          </button>
        }
      />

      {/* Banners */}
      {isSentBack && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          <strong>This section was sent back by the creator.</strong>
          {routing.sent_back_reason && (
            <div className="mt-1">
              Reason: <span className="italic">{routing.sent_back_reason}</span>
            </div>
          )}
          <div className="mt-1">
            Please review, update your data and remarks, then mark as done
            again.
          </div>
        </div>
      )}
      {isWaiting && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          <strong>This step is not yet active.</strong>
          <div className="mt-1">
            A previous section is still working. You'll be notified when it's
            your turn.
          </div>
        </div>
      )}
      {isDone && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle size={16} className="flex-shrink-0" />
          <div>
            <strong>Section data submitted and locked.</strong> Completed on{" "}
            {fmt(routing.completed_at)}.
          </div>
        </div>
      )}

      {/* Assignment Info */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={14} className="text-gray-400" />
          <h3 className="font-semibold text-navy-800">
            Assignment Information
          </h3>
          <span className="text-xs text-gray-400">(read-only)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          {[
            ["Assignment Name", assignment.assignment_name],
            ["Client", `${assignment.client_name} (${assignment.client_type})`],
            ["Created By", assignment.created_by_name],
            ["Section", routing.section_name],
            ["Assigned To", routing.assigned_to_name || "—"],
            ["Assigned On", fmt(routing.assigned_at)],
          ].map(([label, val]) => (
            <div key={label}>
              <div className="text-xs font-semibold text-navy-600 uppercase tracking-wide mb-0.5">
                {label}
              </div>
              <div className="text-gray-800">{val || "—"}</div>
            </div>
          ))}
        </div>
        {assignment.scope && (
          <div className="mt-4 pt-4 border-t border-navy-100">
            <div className="text-xs font-semibold text-navy-600 uppercase tracking-wide mb-1">
              Scope of Work
            </div>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {assignment.scope}
            </div>
          </div>
        )}
      </div>

      {/* Original assignment data table */}
      {assignment.columns?.length > 0 && (
        <div className="card p-6">
          <LockedBanner label="Original assignment data — submitted by the creator. Read-only." />
          <h3 className="font-semibold text-navy-800 mb-3">
            Original Assignment Data
          </h3>
          <ReadOnlyTable columns={assignment.columns} rows={assignment.rows} />
        </div>
      )}

      {/* Previous sections' tables */}
      {prevTables.map((t) => (
        <div key={t.section_table_id} className="card p-6">
          <LockedBanner
            label={`Data submitted by ${t.section_name} (Step ${t.routing_order + 1}). Read-only.`}
          />
          <h3 className="font-semibold text-navy-800 mb-3">
            {t.section_name} — Data Table
          </h3>
          <ReadOnlyTable columns={t.columns} rows={t.rows} />
          {t.remarks && (
            <div className="mt-3 pt-3 border-t border-navy-100">
              <div className="text-xs font-semibold text-navy-600 uppercase tracking-wide mb-1">
                Remarks from this section
              </div>
              <div className="text-sm text-gray-600 italic">{t.remarks}</div>
            </div>
          )}
        </div>
      ))}

      {/* My section's data table */}
      <div className="card p-6">
        {isDone && (
          <LockedBanner label="Your section's data has been submitted and is now locked." />
        )}
        <h3 className="font-semibold text-navy-800 mb-1">
          {isDone ? "Your Section's Submitted Data" : "My Section's Data Table"}
        </h3>
        {canEdit && (
          <p className="text-xs text-gray-500 mb-4">
            Add your section's data below. This will NOT affect any other
            section's data.
          </p>
        )}

        {canEdit ? (
          <>
            <AssignmentTableBuilder
              columns={tableData.columns}
              rows={tableData.rows}
              onChange={({ columns, rows }) => setTableData({ columns, rows })}
            />

            {/* Remarks field — inside the data section, not separate */}
            <div className="mt-5 pt-4 border-t border-navy-100">
              <label className="block text-xs font-semibold text-navy-700 uppercase tracking-wide mb-1">
                Remarks / Notes
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Observations, issues, or comments for the creator. Stored with
                your section's data.
              </p>
              <textarea
                className="input resize-none w-full"
                rows={3}
                placeholder="e.g. Found discrepancies in quantities on rows 3 and 7."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between mt-4">
              <button
                className="btn-secondary flex items-center gap-2"
                onClick={handleSave}
                disabled={saving}
              >
                <Save size={14} /> {saving ? "Saving…" : "Save Draft"}
              </button>
              <button
                className="btn-success flex items-center gap-2"
                onClick={() => setConfirmComplete(true)}
              >
                <CheckCircle size={16} /> Mark Section as Done
              </button>
            </div>
          </>
        ) : (
          <>
            <ReadOnlyTable columns={tableData.columns} rows={tableData.rows} />
            {remarks && (
              <div className="mt-4 pt-4 border-t border-navy-100">
                <div className="text-xs font-semibold text-navy-600 uppercase tracking-wide mb-1">
                  Remarks
                </div>
                <div className="text-sm text-gray-600 italic">{remarks}</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirm complete modal */}
      {confirmComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setConfirmComplete(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-semibold text-navy-800 text-lg mb-2">
              Confirm Completion
            </h3>
            <p className="text-sm text-gray-600 mb-1">
              Are you sure you want to mark this section as done?
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Your data table and remarks will be{" "}
              <strong>locked — no further editing</strong> will be possible. The
              assignment moves to the next section (or back to the creator if
              this is the last section).
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="btn-secondary"
                onClick={() => setConfirmComplete(false)}
              >
                Cancel
              </button>
              <button
                className="btn-success flex items-center gap-2"
                onClick={handleComplete}
                disabled={completing}
              >
                <CheckCircle size={15} />{" "}
                {completing ? "Completing…" : "Yes, Mark Done"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
