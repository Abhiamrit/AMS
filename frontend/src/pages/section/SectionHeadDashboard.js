import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { PageHeader, Spinner, StatCard } from "../../components/ui";
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Inbox,
  Users,
  ClipboardList,
} from "lucide-react";

const STATUS_STYLES = {
  WAITING: "bg-gray-100 text-gray-600",
  "IN PROGRESS": "bg-indigo-100 text-indigo-700",
  DONE: "bg-emerald-100 text-emerald-700",
  "SENT BACK": "bg-red-100 text-red-700",
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${STATUS_STYLES[status] || "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
}

function AssignmentStatusBadge({ status }) {
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

export default function SectionHeadDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active"); // 'active' | 'history'

  useEffect(() => {
    if (!user?.section_id) {
      setLoading(false);
      return;
    }
    Promise.all([
      api.get(`/routing/section/${user.section_id}`),
      api
        .get(`/sections/${user.section_id}/members`)
        .catch(() => ({ data: { members: [] } })),
    ])
      .then(([iRes, mRes]) => {
        setItems(iRes.data.items || []);
        setMembers(mRes.data.members || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user?.section_id]); // eslint-disable-line

  if (loading) return <Spinner />;

  // If not a section head, show a simple redirect notice
  if (!user?.is_section_head) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>This page is for section heads only.</p>
      </div>
    );
  }

  const active = items.filter(
    (i) => i.status === "WAITING" || i.status === "IN PROGRESS",
  );
  const history = items.filter(
    (i) => i.status === "DONE" || i.status === "SENT BACK",
  );
  const unassigned = active.filter((i) => !i.assigned_to);
  const inProgress = active.filter(
    (i) => i.assigned_to && i.status === "IN PROGRESS",
  );

  const formatDT = (s) =>
    s
      ? new Date(s.includes("Z") ? s : s + "Z").toLocaleDateString("en-IN", {
          timeZone: "Asia/Kolkata",
        })
      : "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Section Dashboard"
        subtitle={`Overview of all assignments handled by your section`}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active"
          value={active.length}
          icon={Clock}
          color="navy"
        />
        <StatCard
          label="Unassigned"
          value={unassigned.length}
          icon={Inbox}
          color="amber"
        />
        <StatCard
          label="In Progress"
          value={inProgress.length}
          icon={ClipboardList}
          color="blue"
        />
        <StatCard
          label="Completed"
          value={history.length}
          icon={CheckCircle}
          color="emerald"
        />
      </div>

      {/* Members quick list */}
      {members.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users size={15} className="text-navy-600" />
            <h3 className="font-semibold text-navy-800 text-sm">
              Section Members ({members.length})
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <span
                key={m.user_id}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-navy-50 border border-navy-200 rounded-full text-xs text-navy-700"
              >
                {m.full_name}
                {m.is_section_head === 1 && (
                  <span className="text-amber-500 text-xs">★ Head</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div>
        <div className="flex gap-1 mb-4 border-b border-navy-200">
          {[
            { key: "active", label: `Active (${active.length})` },
            { key: "history", label: `History (${history.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? "border-navy-700 text-navy-800"
                  : "border-transparent text-gray-500 hover:text-navy-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "active" && (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr>
                  {[
                    "Code",
                    "Assignment",
                    "Client",
                    "Creator",
                    "Assigned To",
                    "Routing Status",
                    "Actions",
                  ].map((h) => (
                    <th key={h} className="table-th">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {active.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="text-center py-10 text-gray-400 text-sm"
                    >
                      No active assignments in your section.
                    </td>
                  </tr>
                )}
                {active.map((item) => (
                  <tr key={item.routing_id} className="hover:bg-navy-50">
                    <td className="table-td font-mono text-xs text-navy-700 font-semibold">
                      {item.assignment_code}
                    </td>
                    <td className="table-td text-navy-800 font-medium max-w-xs truncate">
                      {item.assignment_name}
                    </td>
                    <td className="table-td text-xs text-gray-500">
                      {item.client_name}
                    </td>
                    <td className="table-td text-xs text-gray-500">
                      {item.creator_name}
                    </td>
                    <td className="table-td text-xs text-gray-600">
                      {item.assigned_to_name || (
                        <span className="text-amber-500 font-medium italic">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="table-td">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="table-td">
                      <button
                        className="btn-secondary text-xs py-1 px-2"
                        onClick={() => navigate("/section/inbox")}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "history" && (
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr>
                  {[
                    "Code",
                    "Assignment",
                    "Client",
                    "Creator",
                    "Our Status",
                    "Assignment Status",
                    "Completed On",
                    "Notes",
                  ].map((h) => (
                    <th key={h} className="table-th">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center py-10 text-gray-400 text-sm"
                    >
                      No completed assignments yet.
                    </td>
                  </tr>
                )}
                {history.map((item) => (
                  <tr key={item.routing_id} className="hover:bg-navy-50">
                    <td className="table-td font-mono text-xs text-navy-700 font-semibold">
                      {item.assignment_code}
                    </td>
                    <td className="table-td text-navy-800 font-medium max-w-xs truncate">
                      {item.assignment_name}
                    </td>
                    <td className="table-td text-xs text-gray-500">
                      {item.client_name}
                    </td>
                    <td className="table-td text-xs text-gray-500">
                      {item.creator_name}
                    </td>
                    <td className="table-td">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="table-td">
                      <AssignmentStatusBadge status={item.assignment_status} />
                    </td>
                    <td className="table-td text-xs text-gray-400">
                      {formatDT(item.completed_at)}
                    </td>
                    <td className="table-td text-xs text-gray-500 max-w-xs truncate">
                      {item.status === "SENT BACK" ? (
                        <span className="text-red-500">
                          {item.sent_back_reason || "Sent back"}
                        </span>
                      ) : (
                        item.notes || <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
