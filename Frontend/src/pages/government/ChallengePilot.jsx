import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  IndianRupee,
  MapPin,
  Plus,
  Save,
  Trash2,
  Users,
  AlertCircle,
} from "lucide-react";

import AppLayout from "../../components/layout/AppLayout";

function ChallengePilot() {
  const navigate = useNavigate();
  const { challengeId } = useParams();

  const id = challengeId || "1";

  const [pilotData, setPilotData] = useState({
    location: "",
    startDate: "",
    endDate: "",
    budget: "",
    objective: "",
    governmentOwner: "",
    startupContact: "",
  });

  const [milestones, setMilestones] = useState([
    {
      id: crypto.randomUUID(),
      name: "",
      description: "",
      dueDate: "",
      paymentPercentage: "",
    },
  ]);

  const [status, setStatus] = useState("planned");
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setPilotData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const addMilestone = () => {
    setMilestones((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        name: "",
        description: "",
        dueDate: "",
        paymentPercentage: "",
      },
    ]);
  };

  const updateMilestone = (id, field, value) => {
    setMilestones((previous) =>
      previous.map((milestone) =>
        milestone.id === id
          ? {
              ...milestone,
              [field]: value,
            }
          : milestone
      )
    );
  };

  const removeMilestone = (id) => {
    setMilestones((previous) =>
      previous.filter(
        (milestone) => milestone.id !== id
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      await new Promise((resolve) =>
        setTimeout(resolve, 600)
      );

      console.log("Pilot saved:", {
        challengeId: id,
        pilotData,
        milestones,
        status,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartPilot = () => {
    if (!pilotData.location || !pilotData.startDate) {
      alert(
        "Please enter pilot location and start date."
      );
      return;
    }

    setStatus("active");

    console.log("Pilot started:", {
      challengeId: id,
      pilotData,
      milestones,
    });
  };

  return (
    <AppLayout role="government">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8"
        >
          <button
            type="button"
            onClick={() =>
              navigate(
                `/government/challenges/${id}/evaluation`
              )
            }
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Evaluation
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Pilot Planning
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Challenge Pilot
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Configure the controlled pilot before
                implementation begins.
              </p>
            </div>

            <StatusBadge status={status} />
          </div>
        </motion.div>

        {/* STARTUP */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Users className="h-7 w-7" />
              </div>

              <div>
                <p className="text-lg font-semibold">
                  GreenTech Solutions
                </p>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Smart Waste Management Platform
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Challenge ID: {id}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-500/10">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Evaluation Result
              </p>

              <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Recommended for Pilot
              </p>
            </div>

          </div>
        </section>

        {/* PILOT DETAILS */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">

          <div className="mb-6">
            <h2 className="text-lg font-semibold">
              Pilot Details
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Define where, when and how the pilot will
              be conducted.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">

            <FormField
              label="Pilot Location"
              name="location"
              value={pilotData.location}
              onChange={handleChange}
              placeholder="e.g. Jamshedpur Municipal Area"
              icon={MapPin}
            />

            <FormField
              label="Pilot Budget"
              name="budget"
              value={pilotData.budget}
              onChange={handleChange}
              placeholder="e.g. 850000"
              type="number"
              icon={IndianRupee}
            />

            <FormField
              label="Pilot Start Date"
              name="startDate"
              value={pilotData.startDate}
              onChange={handleChange}
              type="date"
              icon={Calendar}
            />

            <FormField
              label="Pilot End Date"
              name="endDate"
              value={pilotData.endDate}
              onChange={handleChange}
              type="date"
              icon={Calendar}
            />

            <FormField
              label="Government Owner"
              name="governmentOwner"
              value={pilotData.governmentOwner}
              onChange={handleChange}
              placeholder="Name of responsible officer"
              icon={Users}
            />

            <FormField
              label="Startup Contact"
              name="startupContact"
              value={pilotData.startupContact}
              onChange={handleChange}
              placeholder="Startup point of contact"
              icon={Users}
            />

          </div>

          <div className="mt-5">
            <label className="text-sm font-semibold">
              Pilot Objective
            </label>

            <textarea
              name="objective"
              value={pilotData.objective}
              onChange={handleChange}
              rows={5}
              placeholder="Describe what the pilot should validate..."
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white p-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-600 dark:focus:ring-slate-800"
            />
          </div>

        </section>

        {/* MILESTONES */}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">

            <div>
              <h2 className="text-lg font-semibold">
                Pilot Milestones
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Define measurable implementation milestones.
              </p>
            </div>

            <button
              type="button"
              onClick={addMilestone}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              <Plus className="h-4 w-4" />
              Add Milestone
            </button>

          </div>

          <div className="mt-6 space-y-5">

            {milestones.map(
              (milestone, index) => (
                <div
                  key={milestone.id}
                  className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800"
                >

                  <div className="mb-4 flex items-center justify-between">

                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold dark:bg-slate-800">
                        {index + 1}
                      </div>

                      <p className="text-sm font-semibold">
                        Milestone {index + 1}
                      </p>
                    </div>

                    {milestones.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          removeMilestone(
                            milestone.id
                          )
                        }
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}

                  </div>

                  <div className="grid gap-4 md:grid-cols-2">

                    <FormField
                      label="Milestone Name"
                      value={milestone.name}
                      onChange={(event) =>
                        updateMilestone(
                          milestone.id,
                          "name",
                          event.target.value
                        )
                      }
                      placeholder="e.g. System Deployment"
                    />

                    <FormField
                      label="Due Date"
                      type="date"
                      value={milestone.dueDate}
                      onChange={(event) =>
                        updateMilestone(
                          milestone.id,
                          "dueDate",
                          event.target.value
                        )
                      }
                    />

                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold">
                        Description
                      </label>

                      <textarea
                        value={milestone.description}
                        onChange={(event) =>
                          updateMilestone(
                            milestone.id,
                            "description",
                            event.target.value
                          )
                        }
                        rows={3}
                        placeholder="Describe what should be completed..."
                        className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950"
                      />
                    </div>

                    <FormField
                      label="Payment Percentage"
                      type="number"
                      value={
                        milestone.paymentPercentage
                      }
                      onChange={(event) =>
                        updateMilestone(
                          milestone.id,
                          "paymentPercentage",
                          event.target.value
                        )
                      }
                      placeholder="e.g. 25"
                    />

                  </div>

                </div>
              )
            )}

          </div>

        </section>

        {/* STATUS */}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">

          <h2 className="text-lg font-semibold">
            Pilot Status
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Update the current stage of the pilot.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">

            <StatusOption
              active={status === "planned"}
              onClick={() => setStatus("planned")}
              title="Planned"
              description="Pilot is being prepared."
            />

            <StatusOption
              active={status === "active"}
              onClick={() => setStatus("active")}
              title="Active"
              description="Pilot implementation is running."
            />

            <StatusOption
              active={status === "completed"}
              onClick={() =>
                setStatus("completed")
              }
              title="Completed"
              description="Pilot has finished successfully."
            />

          </div>

          {status === "active" && (
            <div className="mt-5 flex items-start gap-2 rounded-xl bg-emerald-50 p-4 text-xs leading-5 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              This pilot is marked as active.
            </div>
          )}

        </section>

        {/* ACTIONS */}

        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">

          <button
            type="button"
            onClick={() =>
              navigate(
                `/government/challenges/${id}/evaluation`
              )
            }
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-semibold transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:hover:bg-slate-800"
            >
              <Save className="h-4 w-4" />
              {isSaving
                ? "Saving..."
                : "Save Pilot"}
            </button>

            <button
              type="button"
              onClick={handleStartPilot}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-lg transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              <CheckCircle2 className="h-4 w-4" />
              Start Pilot
            </button>

          </div>

        </div>

      </div>
    </AppLayout>
  );
}

// =========================================================
// FORM FIELD
// =========================================================

function FormField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  icon: Icon,
}) {
  return (
    <div>
      <label className="text-xs font-semibold">
        {label}
      </label>

      <div className="relative mt-2">

        {Icon && (
          <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        )}

        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`h-11 w-full rounded-xl border border-slate-200 bg-white pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-slate-600 dark:focus:ring-slate-800 ${
            Icon ? "pl-10" : "px-4"
          }`}
        />

      </div>
    </div>
  );
}

// =========================================================
// STATUS BADGE
// =========================================================

function StatusBadge({ status }) {
  const labels = {
    planned: "Planned",
    active: "Active",
    completed: "Completed",
  };

  return (
    <div className="inline-flex items-center gap-2 self-start rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300 sm:self-auto">
      <span className="h-2 w-2 rounded-full bg-current" />
      {labels[status]}
    </div>
  );
}

// =========================================================
// STATUS OPTION
// =========================================================

function StatusOption({
  active,
  onClick,
  title,
  description,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
          : "border-slate-200 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-600 dark:hover:bg-slate-800"
      }`}
    >
      <p className="text-sm font-semibold">
        {title}
      </p>

      <p
        className={`mt-1 text-xs leading-5 ${
          active
            ? "text-slate-300 dark:text-slate-600"
            : "text-slate-500 dark:text-slate-400"
        }`}
      >
        {description}
      </p>
    </button>
  );
}

export default ChallengePilot;