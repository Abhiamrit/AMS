import React, { useEffect, useState } from "react";
import api from "../../utils/api";
import {
  PageHeader,
  Modal,
  Badge,
  Spinner,
  EmptyState,
} from "../../components/ui";
import toast from "react-hot-toast";
import {
  UserPlus,
  KeyRound,
  ToggleLeft,
  ToggleRight,
  Shield,
  Pencil,
} from "lucide-react";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showReset, setShowReset] = useState(null);
  const [showEditSection, setShowEditSection] = useState(null); // user being edited
  const [editSectionForm, setEditSectionForm] = useState({
    section_id: "",
    is_section_head: false,
  });
  const [form, setForm] = useState({
    username: "",
    password: "",
    full_name: "",
    role: "STAFF",
    section_id: "",
    is_section_head: false,
  });
  const [newPass, setNewPass] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchUsers = () =>
    api.get("/admin/users").then((r) => {
      setUsers(r.data.users);
      setLoading(false);
    });
  useEffect(() => {
    Promise.all([api.get("/admin/users"), api.get("/sections")]).then(
      ([u, s]) => {
        setUsers(u.data.users);
        setSections(s.data.sections);
        setLoading(false);
      },
    );
  }, []);

  const createUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/admin/users", {
        ...form,
        section_id:
          form.role === "STAFF" ? parseInt(form.section_id) || null : null,
        is_section_head: form.role === "STAFF" ? form.is_section_head : false,
      });
      toast.success("User created successfully.");
      setShowCreate(false);
      setForm({
        username: "",
        password: "",
        full_name: "",
        role: "STAFF",
        section_id: "",
        is_section_head: false,
      });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create user.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (u) => {
    try {
      await api.patch(`/admin/users/${u.user_id}/status`, {
        is_active: !u.is_active,
      });
      toast.success(`User ${u.is_active ? "deactivated" : "activated"}.`);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed.");
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/admin/users/${showReset.user_id}/reset-password`, {
        new_password: newPass,
      });
      toast.success("Password reset successfully.");
      setShowReset(null);
      setNewPass("");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed.");
    } finally {
      setSaving(false);
    }
  };

  const openEditSection = (u) => {
    setEditSectionForm({
      section_id: u.section_id ? String(u.section_id) : "",
      is_section_head: u.is_section_head === 1,
    });
    setShowEditSection(u);
  };

  const saveEditSection = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/admin/users/${showEditSection.user_id}/section`, {
        section_id: editSectionForm.section_id
          ? parseInt(editSectionForm.section_id)
          : null,
        is_section_head: editSectionForm.is_section_head,
      });
      toast.success("Section assignment updated.");
      setShowEditSection(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Create and manage system users"
        action={
          <button
            className="btn-primary flex items-center gap-2"
            onClick={() => setShowCreate(true)}
          >
            <UserPlus size={16} />
            Create User
          </button>
        }
      />

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              {[
                "Full Name",
                "Username",
                "Role",
                "Section",
                "Status",
                "Last Login",
                "Actions",
              ].map((h) => (
                <th key={h} className="table-th">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <EmptyState />
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.user_id} className="hover:bg-navy-50">
                <td className="table-td font-medium text-navy-800">
                  <div className="flex items-center gap-2">
                    {u.full_name}
                    {u.is_section_head === 1 && (
                      <span title="Section Head" className="text-amber-500">
                        <Shield size={13} />
                      </span>
                    )}
                  </div>
                </td>
                <td className="table-td text-gray-500">{u.username}</td>
                <td className="table-td">
                  <Badge status={u.role} />
                </td>
                <td className="table-td text-xs text-gray-500">
                  {u.section_name || <span className="text-gray-300">—</span>}
                </td>
                <td className="table-td">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                  >
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="table-td text-xs text-gray-400">
                  {u.last_login
                    ? new Date(u.last_login + "Z").toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      })
                    : "Never"}
                </td>
                <td className="table-td">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowReset(u);
                        setNewPass("");
                      }}
                      className="text-navy-600 hover:text-navy-800 p-1"
                      title="Reset Password"
                    >
                      <KeyRound size={15} />
                    </button>
                    {u.role === "STAFF" && (
                      <button
                        onClick={() => openEditSection(u)}
                        className="text-indigo-500 hover:text-indigo-700 p-1"
                        title="Edit Section"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    {u.role !== "ADMIN" && (
                      <button
                        onClick={() => toggleStatus(u)}
                        className={`p-1 ${u.is_active ? "text-red-500 hover:text-red-700" : "text-emerald-500 hover:text-emerald-700"}`}
                        title={u.is_active ? "Deactivate" : "Activate"}
                      >
                        {u.is_active ? (
                          <ToggleRight size={18} />
                        ) : (
                          <ToggleLeft size={18} />
                        )}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create New User"
      >
        <form onSubmit={createUser} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input
              className="input"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Username</label>
            <input
              className="input"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Role</label>
            <select
              className="input"
              value={form.role}
              onChange={(e) =>
                setForm({
                  ...form,
                  role: e.target.value,
                  section_id: "",
                  is_section_head: false,
                })
              }
            >
              <option value="STAFF">Staff User</option>
              <option value="MAS">MAS Officer</option>
            </select>
          </div>

          {/* Section fields — only for STAFF */}
          {form.role === "STAFF" && (
            <>
              <div>
                <label className="label">
                  Section <span className="text-red-500">*</span>
                </label>
                <select
                  className="input"
                  required
                  value={form.section_id}
                  onChange={(e) =>
                    setForm({ ...form, section_id: e.target.value })
                  }
                >
                  <option value="">— Select Section —</option>
                  {sections.map((s) => (
                    <option key={s.section_id} value={s.section_id}>
                      {s.section_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setForm({ ...form, is_section_head: !form.is_section_head })
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_section_head ? "bg-navy-600" : "bg-gray-300"}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_section_head ? "translate-x-6" : "translate-x-1"}`}
                  />
                </button>
                <label className="text-sm text-navy-700 font-medium">
                  Section Head
                </label>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Creating…" : "Create User"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        open={!!showReset}
        onClose={() => setShowReset(null)}
        title={`Reset Password — ${showReset?.full_name}`}
      >
        <form onSubmit={resetPassword} className="space-y-4">
          <div>
            <label className="label">New Password</label>
            <input
              className="input"
              type="password"
              required
              minLength={6}
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowReset(null)}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Resetting…" : "Reset Password"}
            </button>
          </div>
        </form>
      </Modal>
      {/* Edit Section Modal */}
      <Modal
        open={!!showEditSection}
        onClose={() => setShowEditSection(null)}
        title={`Edit Section — ${showEditSection?.full_name}`}
      >
        <form onSubmit={saveEditSection} className="space-y-4">
          <div>
            <label className="label">Section</label>
            <select
              className="input"
              value={editSectionForm.section_id}
              onChange={(e) =>
                setEditSectionForm({
                  ...editSectionForm,
                  section_id: e.target.value,
                })
              }
            >
              <option value="">— No Section —</option>
              {sections.map((s) => (
                <option key={s.section_id} value={s.section_id}>
                  {s.section_name}
                </option>
              ))}
            </select>
          </div>
          {editSectionForm.section_id && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setEditSectionForm({
                    ...editSectionForm,
                    is_section_head: !editSectionForm.is_section_head,
                  })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editSectionForm.is_section_head ? "bg-navy-600" : "bg-gray-300"}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editSectionForm.is_section_head ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
              <label className="text-sm text-navy-700 font-medium">
                Section Head
              </label>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowEditSection(null)}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
