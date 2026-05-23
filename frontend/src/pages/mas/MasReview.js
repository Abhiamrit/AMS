import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../utils/api";
import { PageHeader, Badge, Spinner } from "../../components/ui";
import toast from "react-hot-toast";
import { ArrowLeft, CheckCircle, FileDown, FileText, Save } from "lucide-react";

export default function MasReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [sectionTables, setSectionTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState("");
  const [savingRemarks, setSavingRemarks] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);

  const fetchAssignment = () =>
    Promise.all([
      api.get(`/assignments/${id}`),
      api.get(`/routing/assignment/${id}/tables`).catch(() => ({ data: { tables: [] } })),
    ]).then(([r, t]) => {
      setAssignment(r.data.assignment);
      setRemarks(r.data.assignment.mas_remarks || "");
      setSectionTables(t.data.tables || []);
      setLoading(false);
    });

  useEffect(() => { fetchAssignment(); }, [id]); // eslint-disable-line

  const saveRemarks = async () => {
    setSavingRemarks(true);
    try {
      await api.patch(`/assignments/${id}/remarks`, { mas_remarks: remarks });
      toast.success("Remarks saved.");
    } catch {
      toast.error("Failed to save remarks.");
    } finally { setSavingRemarks(false); }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await api.patch(`/assignments/${id}/remarks`, { mas_remarks: remarks });
      await api.post(`/assignments/${id}/complete`, { mas_remarks: remarks });
      toast.success("Assignment marked as Completed!");
      fetchAssignment();
      setConfirmComplete(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to complete.");
    } finally { setCompleting(false); }
  };

  const exportPDF = () => { window.open(`${process.env.REACT_APP_API_URL}/export/${id}/pdf`, "_blank"); };
  const exportExcel = () => { window.open(`${process.env.REACT_APP_API_URL}/export/${id}/excel`, "_blank"); };

  const formatDate = (s) => {
    if (!s) return "—";
    const d = new Date(s.includes("Z") ? s : s + "Z");
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
  };

  const formatDateTime = (s) => {
    if (!s) return "—";
    const d = new Date(s.includes("Z") ? s : s + "Z");
    if (isNaN(d)) return "—";
    return d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  };

  if (loading) return <Spinner />;
  if (!assignment) return <div className="text-center py-12 text-gray-400">Assignment not found.</div>;

  const isCompleted = assignment.status === "COMPLETED";

  return (
    <div>
      <PageHeader
        title="Assignment Review"
        subtitle={assignment.assignment_code}
        action={
          <div className="flex gap-2">
            <button className="btn-secondary flex items-center gap-2" onClick={() => navigate("/mas")}>
              <ArrowLeft size={16} /> Back
            </button>
            <button className="btn-secondary flex items-center gap-2 text-xs" onClick={exportPDF}>
              <FileText size={14} /> PDF
            </button>
            <button className="btn-secondary flex items-center gap-2 text-xs" onClick={exportExcel}>
              <FileDown size={14} /> Excel
            </button>
          </div>
        }
      />

      <div className="space-y-5">
        {/* Assignment Info Card */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-navy-800">Assignment Information</h3>
            <Badge status={assignment.status} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            {[
              ["Assignment ID", assignment.assignment_code],
              ["Assignment Name", assignment.assignment_name],
              ["Client", `${assignment.client_name} (${assignment.client_type})`],
              ["Client Code", assignment.client_code],
              ["Section", assignment.section_name],
              ["Section Head", assignment.section_head],
              ["Created By", assignment.created_by_name],
              ["Created On", formatDate(assignment.created_at)],
              ["Forwarded On", formatDate(assignment.forwarded_at)],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="text-xs font-semibold text-navy-600 uppercase tracking-wide mb-0.5">{label}</div>
                <div className="text-gray-800">{value || "—"}</div>
              </div>
            ))}
          </div>
          {assignment.scope && (
            <div className="mt-4 pt-4 border-t border-navy-100">
              <div className="text-xs font-semibold text-navy-600 uppercase tracking-wide mb-1">Scope of Work</div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">{assignment.scope}</div>
            </div>
          )}
        </div>

        {/* Original Assignment Data Table */}
        {assignment.columns?.length > 0 && (
          <div className="card p-6">
            <h3 className="font-semibold text-navy-800 mb-4">Assignment Data Table</h3>
            <SectionTable columns={assignment.columns} rows={assignment.rows} />
            <p className="text-xs text-gray-400 mt-2">
              {assignment.columns.length} columns · {assignment.rows.length} rows
            </p>
          </div>
        )}

        {/* Section Data Tables */}
        {sectionTables.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-navy-700 text-sm uppercase tracking-wide px-1">Section Reviews</h3>
            {sectionTables.map(t => (
              <div key={t.section_table_id} className="card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                  <h3 className="font-semibold text-navy-800">
                    {t.section_name}
                    <span className="ml-2 text-xs font-normal text-gray-400">— Step {(t.routing_order || 0) + 1}</span>
                  </h3>
                  <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded ${
                    t.routing_status === 'DONE' ? 'bg-emerald-100 text-emerald-700' :
                    t.routing_status === 'IN PROGRESS' ? 'bg-indigo-100 text-indigo-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>{t.routing_status}</span>
                </div>
                {t.columns.length === 0
                  ? <div className="text-sm text-gray-400 italic">No data submitted by this section.</div>
                  : <SectionTable columns={t.columns} rows={t.rows} />
                }
              </div>
            ))}
          </div>
        )}

        {/* MAS Remarks */}
        <div className="card p-6">
          <h3 className="font-semibold text-navy-800 mb-3">MAS Remarks</h3>
          {isCompleted ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded p-4 text-sm text-gray-700 whitespace-pre-wrap">
              {assignment.mas_remarks || <span className="text-gray-400 italic">No remarks added.</span>}
            </div>
          ) : (
            <>
              <textarea
                className="input resize-none w-full"
                rows={5}
                placeholder="Add your observations, findings, and recommendations here…"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
              <div className="flex justify-end mt-3">
                <button
                  className="btn-secondary flex items-center gap-2"
                  onClick={saveRemarks}
                  disabled={savingRemarks}
                >
                  <Save size={14} />{savingRemarks ? "Saving…" : "Save Remarks"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Complete Action */}
        {!isCompleted && (
          <div className="card p-6 bg-amber-50 border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-amber-900">Mark as Completed</div>
                <div className="text-sm text-amber-700 mt-0.5">This will notify the originating staff user and close the assignment.</div>
              </div>
              <button className="btn-success flex items-center gap-2" onClick={() => setConfirmComplete(true)}>
                <CheckCircle size={16} /> Mark Complete
              </button>
            </div>
          </div>
        )}

        {isCompleted && (
          <div className="card p-4 bg-emerald-50 border-emerald-200 flex items-center gap-3">
            <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
            <div className="text-sm text-emerald-800">
              This assignment was completed on <strong>{formatDateTime(assignment.completed_at)}</strong>
              {assignment.completed_by_name && ` by ${assignment.completed_by_name}`}.
            </div>
          </div>
        )}
      </div>

      {/* Confirm Complete Modal */}
      {confirmComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmComplete(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-semibold text-navy-800 text-lg mb-2">Confirm Completion</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to mark <strong>{assignment.assignment_code}</strong> as Completed? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setConfirmComplete(false)}>Cancel</button>
              <button className="btn-success flex items-center gap-2" onClick={handleComplete} disabled={completing}>
                <CheckCircle size={15} />{completing ? "Completing…" : "Yes, Mark Complete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTable({ columns, rows }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-navy-200">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="bg-navy-700">
            <th className="px-3 py-2.5 text-left text-white font-medium">#</th>
            {columns.map((col) => (
              <th key={col.column_id} className="px-3 py-2.5 text-left text-white font-medium">
                <div>{col.column_name}</div>
                <div className="text-navy-300 text-xs font-normal">{col.column_type}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={columns.length + 1} className="text-center py-6 text-gray-400">No data rows.</td></tr>
          )}
          {rows.map((row, ri) => (
            <tr key={row.row_id} className={ri % 2 === 0 ? "bg-white" : "bg-navy-50"}>
              <td className="px-3 py-2 text-gray-400">{ri + 1}</td>
              {columns.map((col) => {
                const val = row.cells[col.column_id] ?? "";
                return (
                  <td key={col.column_id} className="px-3 py-2 text-gray-700 border-l border-navy-100">
                    {col.column_type === "CHECKBOX" ? (
                      <span className={`inline-block w-4 h-4 rounded border ${val === "true" ? "bg-emerald-500 border-emerald-600" : "border-gray-300"}`} />
                    ) : (
                      val || <span className="text-gray-300">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
