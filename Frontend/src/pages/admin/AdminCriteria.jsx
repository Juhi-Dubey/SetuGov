import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Edit3,
  FileText,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const initialCriteria = [
  {
    id: 1,
    name: "Innovation",
    description:
      "Measures the originality and innovative nature of the proposed solution.",
    weight: 25,
    status: "Active",
  },
  {
    id: 2,
    name: "Technical Feasibility",
    description:
      "Evaluates whether the proposed technology can realistically be implemented.",
    weight: 20,
    status: "Active",
  },
  {
    id: 3,
    name: "Scalability",
    description:
      "Measures the ability of the solution to scale across departments and locations.",
    weight: 15,
    status: "Active",
  },
  {
    id: 4,
    name: "Cost Effectiveness",
    description:
      "Evaluates the value delivered compared with implementation and operational costs.",
    weight: 15,
    status: "Active",
  },
  {
    id: 5,
    name: "Social Impact",
    description:
      "Measures the expected social and public-service impact of the solution.",
    weight: 15,
    status: "Active",
  },
  {
    id: 6,
    name: "Implementation Readiness",
    description:
      "Evaluates the startup's readiness to deploy and support the solution.",
    weight: 10,
    status: "Inactive",
  },
];

function AdminCriteria() {
  const navigate = useNavigate();

  const [criteria, setCriteria] =
    useState(initialCriteria);

  const [showModal, setShowModal] =
    useState(false);

  const [editingCriteria, setEditingCriteria] =
    useState(null);

  const [deleteId, setDeleteId] =
    useState(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    weight: "",
    status: "Active",
  });

  const totalWeight = useMemo(() => {
    return criteria
      .filter(
        (item) => item.status === "Active"
      )
      .reduce(
        (total, item) =>
          total + Number(item.weight),
        0
      );
  }, [criteria]);

  const activeCount = criteria.filter(
    (item) => item.status === "Active"
  ).length;

  const inactiveCount = criteria.filter(
    (item) => item.status === "Inactive"
  ).length;

  const openAddModal = () => {
    setEditingCriteria(null);

    setForm({
      name: "",
      description: "",
      weight: "",
      status: "Active",
    });

    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingCriteria(item);

    setForm({
      name: item.name,
      description: item.description,
      weight: String(item.weight),
      status: item.status,
    });

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCriteria(null);
  };

  const handleChange = (event) => {
    const { name, value } =
      event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const weight = Number(form.weight);

    if (
      !form.name.trim() ||
      !form.description.trim() ||
      !weight ||
      weight <= 0 ||
      weight > 100
    ) {
      return;
    }

    if (editingCriteria) {
      setCriteria((current) =>
        current.map((item) =>
          item.id === editingCriteria.id
            ? {
                ...item,
                name: form.name.trim(),
                description:
                  form.description.trim(),
                weight,
                status: form.status,
              }
            : item
        )
      );
    } else {
      setCriteria((current) => [
        ...current,
        {
          id: Date.now(),
          name: form.name.trim(),
          description:
            form.description.trim(),
          weight,
          status: form.status,
        },
      ]);
    }

    closeModal();
  };

  const toggleStatus = (id) => {
    setCriteria((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              status:
                item.status === "Active"
                  ? "Inactive"
                  : "Active",
            }
          : item
      )
    );
  };

  const handleDelete = () => {
    setCriteria((current) =>
      current.filter(
        (item) => item.id !== deleteId
      )
    );

    setDeleteId(null);
  };

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 12,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.35,
      }}
      className="space-y-6"
    >
      {/* HEADER */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <button
          type="button"
          onClick={() =>
            navigate("/admin/dashboard")
          }
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin Dashboard
        </button>

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <FileText className="h-6 w-6" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Administration
              </p>

              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Evaluation Criteria
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Configure the criteria used by
                evaluators to assess startup
                applications and solutions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Add Criteria
          </button>
        </div>
      </section>

      {/* SUMMARY */}

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Total Criteria"
          value={criteria.length}
          icon={FileText}
        />

        <SummaryCard
          title="Active Criteria"
          value={activeCount}
          icon={CheckCircle2}
          type="success"
        />

        <SummaryCard
          title="Active Weightage"
          value={`${totalWeight}%`}
          icon={WeightIcon}
          type={
            totalWeight === 100
              ? "success"
              : "warning"
          }
        />
      </section>

      {/* WEIGHTAGE WARNING */}

      <section
        className={`rounded-3xl border p-5 sm:p-6 ${
          totalWeight === 100
            ? "border-emerald-100 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/5"
            : "border-amber-100 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/5"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              totalWeight === 100
                ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
            }`}
          >
            {totalWeight === 100 ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <WeightIcon className="h-5 w-5" />
            )}
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {totalWeight === 100
                ? "Weightage is correctly configured"
                : "Weightage requires attention"}
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Active criteria currently account for{" "}
              <strong>{totalWeight}%</strong> of the
              total evaluation score.
              {totalWeight !== 100 &&
                " The recommended total is 100%."}
            </p>
          </div>
        </div>
      </section>

      {/* CRITERIA LIST */}

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Criteria Configuration
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {activeCount} active and{" "}
            {inactiveCount} inactive criteria.
          </p>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {criteria.map(
            (item, index) => (
              <CriteriaRow
                key={item.id}
                item={item}
                index={index}
                onEdit={() =>
                  openEditModal(item)
                }
                onToggle={() =>
                  toggleStatus(item.id)
                }
                onDelete={() =>
                  setDeleteId(item.id)
                }
              />
            )
          )}
        </div>

        {criteria.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <FileText className="h-8 w-8 text-slate-300" />

            <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">
              No criteria available
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Add your first evaluation criterion.
            </p>

            <button
              type="button"
              onClick={openAddModal}
              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 text-[10px] font-bold text-white hover:bg-indigo-700"
            >
              Add Criteria
            </button>
          </div>
        )}
      </section>

      {/* ADD / EDIT MODAL */}

      {showModal && (
        <CriteriaModal
          form={form}
          editing={editingCriteria}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onClose={closeModal}
        />
      )}

      {/* DELETE MODAL */}

      {deleteId && (
        <DeleteModal
          onClose={() =>
            setDeleteId(null)
          }
          onConfirm={handleDelete}
        />
      )}
    </motion.div>
  );
}

/* ===================================================== */
/* SUMMARY CARD                                          */
/* ===================================================== */

function SummaryCard({
  title,
  value,
  icon: Icon,
  type,
}) {
  let iconClass =
    "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400";

  if (type === "success") {
    iconClass =
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400";
  }

  if (type === "warning") {
    iconClass =
      "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400";
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <p className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>

      <p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-300">
        {title}
      </p>
    </div>
  );
}

/* ===================================================== */
/* CRITERIA ROW                                          */
/* ===================================================== */

function CriteriaRow({
  item,
  index,
  onEdit,
  onToggle,
  onDelete,
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 5,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay: index * 0.04,
      }}
      className="p-5 sm:p-6"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        {/* NUMBER */}

        <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-400 lg:flex">
          {String(index + 1).padStart(
            2,
            "0"
          )}
        </div>

        {/* CONTENT */}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {item.name}
            </h3>

            <StatusBadge
              status={item.status}
            />
          </div>

          <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-500 dark:text-slate-400">
            {item.description}
          </p>
        </div>

        {/* WEIGHT */}

        <div className="flex items-center gap-2 lg:w-24 lg:flex-col lg:items-end">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Weight
          </span>

          <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
            {item.weight}%
          </span>
        </div>

        {/* ACTIONS */}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit
          </button>

          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            {item.status === "Active" ? (
              <>
                <XCircle className="h-3.5 w-3.5" />
                Disable
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Enable
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center justify-center rounded-xl border border-red-100 p-2 text-red-500 hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-500/10"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ===================================================== */
/* STATUS BADGE                                          */
/* ===================================================== */

function StatusBadge({
  status,
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold ${
        status === "Active"
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
      }`}
    >
      {status}
    </span>
  );
}

/* ===================================================== */
/* CRITERIA MODAL                                        */
/* ===================================================== */

function CriteriaModal({
  form,
  editing,
  onChange,
  onSubmit,
  onClose,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.96,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        onClick={(event) =>
          event.stopPropagation()
        }
        className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-500">
              Evaluation System
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
              {editing
                ? "Edit Criteria"
                : "Add Criteria"}
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Configure the evaluation criterion.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="mt-6 space-y-4"
        >
          <Field
            label="Criteria Name"
            name="name"
            value={form.name}
            onChange={onChange}
            placeholder="e.g. Market Potential"
            required
          />

          <div>
            <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
              Description
            </label>

            <textarea
              name="description"
              value={form.description}
              onChange={onChange}
              rows={4}
              required
              placeholder="Describe what this criterion evaluates..."
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Weightage (%)"
              name="weight"
              type="number"
              min="1"
              max="100"
              value={form.weight}
              onChange={onChange}
              placeholder="25"
              required
            />

            <div>
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                Status
              </label>

              <select
                name="status"
                value={form.status}
                onChange={onChange}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                <option value="Active">
                  Active
                </option>

                <option value="Inactive">
                  Inactive
                </option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-[10px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-[10px] font-bold text-white hover:bg-indigo-700"
            >
              {editing
                ? "Save Changes"
                : "Add Criteria"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ===================================================== */
/* FIELD                                                 */
/* ===================================================== */

function Field({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  min,
  max,
}) {
  return (
    <div>
      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
        {label}
      </label>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
      />
    </div>
  );
}

/* ===================================================== */
/* DELETE MODAL                                          */
/* ===================================================== */

function DeleteModal({
  onClose,
  onConfirm,
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.96,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        onClick={(event) =>
          event.stopPropagation()
        }
        className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
          <Trash2 className="h-5 w-5" />
        </div>

        <h2 className="mt-4 text-sm font-bold text-slate-900 dark:text-white">
          Delete this criteria?
        </h2>

        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          This action will remove the criteria from
          the current configuration.
        </p>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-[10px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-[10px] font-bold text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ===================================================== */
/* WEIGHT ICON                                           */
/* ===================================================== */

function WeightIcon({
  className = "h-5 w-5",
}) {
  return (
    <div
      className={`${className} flex items-center justify-center font-bold`}
    >
      %
    </div>
  );
}

export default AdminCriteria;