import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../utils/api";
import { PageHeader, Badge, Spinner } from "../../components/ui";
import AssignmentTimeline from "../../components/AssignmentTimeline";
import toast from "react-hot-toast";
import { ArrowLeft, Send, RotateCcw } from "lucide-react";

export default function AssignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [routing, setRouting] = useState([]);
  const [sectionTables, setSectionTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forwarding, setForwarding] = useState(false);
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [sendBack, setSendBack] = useState(null); // routing step to send back
  const [sendBackReason, setSendBackReason] = useState("");
  const [sendingBack, setSendingBack] = useState(false);

  const fetchAll = async () => {
    const [aRes, rRes, tRes] = await Promise.all([
      api.get(`/assignments/${id}`),
      api.get(`/assignments/${id}/routing`),
      api.get(`/routing/assignment/${id}/tables`),
    ]);
    setAssignment(aRes.data.assignment);
    setRouting(rRes.data.routing);
    setSectionTables(tRes.data.tables);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, [id]); // eslint-disable-line

  const handleForward = async (e) => {
    e.preventDefault();
    setVerifying(true);
    try {
      await api.post("/auth/verify-password", { password });
      await api.post(`/assignments/${id}/forward`);
      toast.success("Assignment forwarded to MAS!");
      setForwarding(false);
      setPassword("");
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to forward.");
    } finally {
      setVerifying(false);
    }
  };

  const handleSendBack = async (e) => {
    e.preventDefault();
    setSendingBack(true);
    try {
      await api.post(`/routing/${sendBack.routing_id}/sendback`, {
        reason: sendBackReason,
      });
      toast.success(`Sent back to ${sendBack.section_name}.`);
      setSendBack(null);
      setSendBackReason("");
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send back.");
    } finally {
      setSendingBack(false);
    }
  };

  const formatDT = (s) =>
    s
      ? new Date(s.includes("Z") ? s : s + "Z").toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        })
      : "—";

  if (loading) return <Spinner />;
  if (!assignment)
    return (
      <div className="text-center py-12 text-gray-400">
        Assignment not found.
      </div>
    );

  const isUnderReview = assignment.status === "UNDER REVIEW";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Assignment Detail"
        subtitle={assignment.assignment_code}
        action={
          <div className="flex gap-2">
            <button
              className="btn-secondary flex items-center gap-2"
              onClick={() => navigate("/staff/assignments")}
            >
              <ArrowLeft size={16} /> Back
            </button>
            {isUnderReview && (
              <button
                className="btn-primary flex items-center gap-2"
                onClick={() => setForwarding(true)}
              >
                <Send size={16} /> Forward to MAS
              </button>
            )}
          </div>
        }
      />

      {/* Assignment Info */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-navy-800">
            Assignment Information
          </h3>
          <StatusBadge status={assignment.status} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          {[
            ["Assignment ID", assignment.assignment_code],
            ["Name", assignment.assignment_name],
            ["Client", `${assignment.client_name} (${assignment.client_type})`],
            ["Section", assignment.section_name],
            ["Created By", assignment.created_by_name],
            ["Created On", formatDT(assignment.created_at)],
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

      {/* Routing Timeline */}
      <AssignmentTimeline
        routing={routing}
        sectionTables={sectionTables}
        isUnderReview={isUnderReview}
        onSendBack={(step) => {
          setSendBack(step);
          setSendBackReason("");
        }}
      />

      {/* Forward to MAS Modal */}
      {forwarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setForwarding(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-navy-100">
              <h3 className="font-semibold text-navy-800">Forward to MAS</h3>
            </div>
            <form onSubmit={handleForward} className="px-6 py-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
                <strong>Warning:</strong> Once forwarded, this cannot be
                recalled. Assignment:{" "}
                <span className="font-mono font-semibold">
                  {assignment.assignment_code}
                </span>
              </div>
              <div>
                <label className="label">Confirm your password</label>
                <input
                  type="password"
                  className="input"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setForwarding(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center gap-2"
                  disabled={verifying}
                >
                  <Send size={14} />
                  {verifying ? "Forwarding…" : "Confirm & Forward"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Back Modal */}
      {sendBack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSendBack(null)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-navy-100">
              <h3 className="font-semibold text-navy-800">
                Send Back to {sendBack.section_name}
              </h3>
            </div>
            <form onSubmit={handleSendBack} className="px-6 py-5 space-y-4">
              <div>
                <label className="label">Reason (optional)</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  value={sendBackReason}
                  onChange={(e) => setSendBackReason(e.target.value)}
                  placeholder="Describe what needs to be corrected or revised…"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setSendBack(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center gap-2"
                  disabled={sendingBack}
                >
                  <RotateCcw size={14} />
                  {sendingBack ? "Sending…" : "Send Back"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    DRAFT: "bg-gray-100 text-gray-700",
    "IN ROUTING": "bg-indigo-100 text-indigo-700",
    "UNDER REVIEW": "bg-yellow-100 text-yellow-800",
    PENDING: "bg-amber-100 text-amber-800",
    COMPLETED: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${map[status] || "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
}
