import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { PageHeader, Spinner } from "../../components/ui";
import toast from "react-hot-toast";
import { ArrowLeft, GitBranch, Plus, Trash2, GripVertical } from "lucide-react";

export default function RouteSetup() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assignment, setAssignment] = useState(null);
  const [sections, setSections] = useState([]);
  const [routingSections, setRoutingSections] = useState([]); // ordered array of section_ids
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    Promise.all([api.get(`/assignments/${id}`), api.get("/sections")])
      .then(([aRes, sRes]) => {
        const a = aRes.data.assignment;
        if (a.status !== "DRAFT") {
          toast.error("Only DRAFT assignments can have routing set up.");
          navigate(`/staff/assignments/${id}/detail`);
          return;
        }
        setAssignment(a);
        setSections(sRes.data.sections);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load assignment.");
        navigate("/staff/assignments");
      });
  }, [id]); // eslint-disable-line

  const addSection = (sectionId) => {
    const id = parseInt(sectionId);
    if (!id) return;
    if (routingSections.includes(id)) {
      toast.error("Section already in routing chain.");
      return;
    }
    if (user?.is_section_head && user?.section_id && id === user.section_id) {
      toast.error("You cannot route to your own section.");
      return;
    }
    setRoutingSections([...routingSections, id]);
  };

  const removeSection = (idx) => {
    setRoutingSections(routingSections.filter((_, i) => i !== idx));
  };

  const moveSection = (idx, dir) => {
    const arr = [...routingSections];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setRoutingSections(arr);
  };

  const getSectionName = (sid) =>
    sections.find((s) => s.section_id === sid)?.section_name ||
    `Section ${sid}`;

  const handleStartRouting = async () => {
    if (routingSections.length === 0) {
      toast.error("Add at least one section.");
      return;
    }
    setStarting(true);
    try {
      await api.post(`/assignments/${id}/route`, {
        section_ids: routingSections,
      });
      toast.success("Routing started! Assignment is now IN ROUTING.");
      navigate(`/staff/assignments/${id}/detail`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to start routing.");
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <Spinner />;
  if (!assignment) return null;

  const availableSections = sections.filter(
    (s) =>
      !routingSections.includes(s.section_id) &&
      !(user?.is_section_head && s.section_id === user?.section_id),
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Set Up Routing"
        subtitle={`${assignment.assignment_code} — ${assignment.assignment_name}`}
        action={
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={() => navigate("/staff/assignments")}
          >
            <ArrowLeft size={16} /> Back
          </button>
        }
      />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <strong>How routing works:</strong> The assignment will be sent to each
        section below in order. Each section reviews it and adds their data.
        When all sections are done, it comes back to you as{" "}
        <strong>UNDER REVIEW</strong> — then you can forward it to MAS.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left — section picker */}
        <div className="card p-6">
          <h3 className="font-semibold text-navy-800 mb-3">
            Available Sections
          </h3>
          {availableSections.length === 0 ? (
            <div className="text-sm text-gray-400 italic">
              All sections added.
            </div>
          ) : (
            <div className="space-y-2">
              {availableSections.map((s) => (
                <button
                  key={s.section_id}
                  onClick={() => addSection(s.section_id)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-navy-200 bg-white hover:bg-navy-50 text-sm text-navy-800 transition-colors text-left"
                >
                  <span>{s.section_name}</span>
                  <Plus size={15} className="text-navy-500" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right — routing order */}
        <div className="card p-6">
          <h3 className="font-semibold text-navy-800 mb-3">Routing Order</h3>
          {routingSections.length === 0 ? (
            <div className="text-sm text-gray-400 italic py-4 text-center">
              No sections added yet. Pick from the left to build the chain.
            </div>
          ) : (
            <div className="space-y-2">
              {routingSections.map((sid, idx) => (
                <div
                  key={sid}
                  className="flex items-center gap-2 bg-navy-50 border border-navy-200 rounded-lg px-3 py-2.5"
                >
                  <GripVertical
                    size={14}
                    className="text-gray-300 flex-shrink-0"
                  />
                  <span className="w-5 h-5 rounded-full bg-navy-700 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="flex-1 text-sm text-navy-800">
                    {getSectionName(sid)}
                  </span>
                  <button
                    onClick={() => moveSection(idx, -1)}
                    disabled={idx === 0}
                    className="text-gray-400 hover:text-navy-600 disabled:opacity-20 p-0.5"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveSection(idx, 1)}
                    disabled={idx === routingSections.length - 1}
                    className="text-gray-400 hover:text-navy-600 disabled:opacity-20 p-0.5"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => removeSection(idx)}
                    className="text-red-400 hover:text-red-600 p-0.5 ml-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          className="btn-secondary"
          onClick={() => navigate("/staff/assignments")}
        >
          Skip — Route Later
        </button>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={handleStartRouting}
          disabled={starting || routingSections.length === 0}
        >
          <GitBranch size={16} />
          {starting ? "Starting…" : "Start Routing"}
        </button>
      </div>
    </div>
  );
}
