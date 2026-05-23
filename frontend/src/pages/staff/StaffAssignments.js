import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { PageHeader, Badge, Spinner, EmptyState } from "../../components/ui";
import { Plus, Pencil, Send, Eye, GitBranch, Briefcase } from "lucide-react";
import toast from "react-hot-toast";

export default function StaffAssignments() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [inboxMap, setInboxMap] = useState({}); // assignment_id -> routing_id for items assigned to this user
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [forwarding, setForwarding] = useState(null);
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);

  const fetchAssignments = async () => {
    const [aRes, iRes] = await Promise.all([
      api.get("/assignments"),
      api.get("/assignments/inbox").catch(() => ({ data: { items: [] } })),
    ]);
    setAssignments(aRes.data.assignments);
    // Build a map: assignment_id -> routing_id for work assigned to this user
    const map = {};
    (iRes.data.items || []).forEach((item) => {
      map[item.assignment_id] = item.routing_id;
    });
    setInboxMap(map);
    setLoading(false);
  };

  useEffect(() => {
    fetchAssignments();
  }, []); // eslint-disable-line

  const filtered = statusFilter
    ? assignments.filter((a) => a.status === statusFilter)
    : assignments;

  const handleForward = async (e) => {
    e.preventDefault();
    setVerifying(true);
    try {
      await api.post("/auth/verify-password", { password });
      await api.post(`/assignments/${forwarding.assignment_id}/forward`);
      toast.success(
        `Assignment ${forwarding.assignment_code} forwarded to MAS!`,
      );
      setForwarding(null);
      setPassword("");
      fetchAssignments();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to forward assignment.");
    } finally {
      setVerifying(false);
    }
  };

  const ALL_STATUSES = [
    "DRAFT",
    "IN ROUTING",
    "UNDER REVIEW",
    "PENDING",
    "COMPLETED",
  ];

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="My Assignments"
        subtitle="Manage your assignments"
        action={
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => navigate("/staff/assignments/new")}
          >
            <Plus size={16} />
            New Assignment
          </button>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {["", ...ALL_STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${statusFilter === s ? "bg-navy-700 text-white border-navy-700" : "bg-white text-navy-700 border-navy-200 hover:bg-navy-50"}`}
          >
            {s || "All"}{" "}
            {s && `(${assignments.filter((a) => a.status === s).length})`}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              {[
                "Code",
                "Name",
                "Client",
                "Section",
                "Status",
                "Date",
                "Actions",
              ].map((h) => (
                <th key={h} className="table-th">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState message="No assignments found." />
                </td>
              </tr>
            )}
            {filtered.map((a) => (
              <tr key={a.assignment_id} className="hover:bg-navy-50">
                <td className="table-td font-mono text-xs text-navy-700 font-semibold">
                  {a.assignment_code}
                </td>
                <td className="table-td text-navy-800 font-medium max-w-xs truncate">
                  {a.assignment_name}
                </td>
                <td className="table-td text-gray-500 text-xs">
                  {a.client_name}
                </td>
                <td className="table-td text-gray-500 text-xs">
                  {a.section_name}
                </td>
                <td className="table-td">
                  <StatusBadge status={a.status} />
                  {a.status === "IN ROUTING" && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      Step {(a.current_routing_step || 0) + 1}/
                      {a.total_routing_steps || "?"}
                    </div>
                  )}
                </td>
                <td className="table-td text-xs text-gray-400">
                  {new Date(a.created_at).toLocaleDateString("en-IN")}
                </td>
                <td className="table-td">
                  <div className="flex items-center gap-2">
                    {/* ── Actions for the CREATOR of this assignment ── */}
                    {parseInt(a.created_by) === parseInt(user?.user_id) && (
                      <>
                        {a.status === "DRAFT" && (
                          <>
                            <button
                              onClick={() =>
                                navigate(
                                  `/staff/assignments/${a.assignment_id}/edit`,
                                )
                              }
                              className="text-navy-600 hover:text-navy-800 p-1"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() =>
                                navigate(
                                  `/staff/assignments/${a.assignment_id}/route`,
                                )
                              }
                              className="text-indigo-600 hover:text-indigo-800 p-1"
                              title="Set Routing"
                            >
                              <GitBranch size={14} />
                            </button>
                          </>
                        )}
                        {a.status === "UNDER REVIEW" && (
                          <>
                            <button
                              onClick={() =>
                                navigate(
                                  `/staff/assignments/${a.assignment_id}/detail`,
                                )
                              }
                              className="text-navy-600 hover:text-navy-800 p-1"
                              title="View Detail"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setForwarding(a);
                                setPassword("");
                              }}
                              className="text-amber-600 hover:text-amber-800 p-1"
                              title="Forward to MAS"
                            >
                              <Send size={14} />
                            </button>
                          </>
                        )}
                        {(a.status === "IN ROUTING" ||
                          a.status === "PENDING" ||
                          a.status === "COMPLETED") && (
                          <button
                            onClick={() =>
                              navigate(
                                `/staff/assignments/${a.assignment_id}/detail`,
                              )
                            }
                            className="text-navy-600 hover:text-navy-800 p-1"
                            title="View Detail"
                          >
                            <Eye size={14} />
                          </button>
                        )}
                      </>
                    )}

                    {/* ── Actions for a SECTION MEMBER this assignment is assigned to ── */}
                    {parseInt(a.created_by) !== parseInt(user?.user_id) &&
                      inboxMap[a.assignment_id] && (
                        <button
                          onClick={() =>
                            navigate(
                              `/section/work/${inboxMap[a.assignment_id]}`,
                            )
                          }
                          className="btn-primary text-xs py-1 px-2.5 flex items-center gap-1"
                          title="Open your work for this assignment"
                        >
                          <Briefcase size={12} /> Open Work
                        </button>
                      )}

                    {/* ── Assignment routed to user's section but not yet assigned to them personally ── */}
                    {parseInt(a.created_by) !== parseInt(user?.user_id) &&
                      !inboxMap[a.assignment_id] && (
                        <span className="text-xs text-gray-400 italic">
                          Awaiting assignment
                        </span>
                      )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Forward confirmation modal — only shows for UNDER REVIEW */}
      {forwarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setForwarding(null)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-navy-100">
              <h3 className="font-semibold text-navy-800">
                Forward Assignment to MAS
              </h3>
            </div>
            <form onSubmit={handleForward} className="px-6 py-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
                <strong>Warning:</strong> Once forwarded to MAS, this assignment
                cannot be recalled. <br />
                Assignment:{" "}
                <span className="font-mono font-semibold">
                  {forwarding.assignment_code}
                </span>
              </div>
              <div>
                <label className="label">
                  Confirm your password to proceed
                </label>
                <input
                  type="password"
                  className="input"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setForwarding(null)}
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
      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${map[status] || "bg-gray-100 text-gray-700"}`}
    >
      {status}
    </span>
  );
}
