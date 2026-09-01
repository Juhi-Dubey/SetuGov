import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  Edit3,
  Eye,
  FileText,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const initialTemplates = [
  {
    id: 1,
    name: "Government Challenge Template",
    type: "Challenge",
    description:
      "Standard template for creating outcome-based government challenges.",
    fields: 12,
    status: "Active",
    updated: "28 Aug 2026",
  },
  {
    id: 2,
    name: "Startup Evaluation Template",
    type: "Evaluation",
    description:
      "Standard evaluation form containing innovation, feasibility, scalability and impact criteria.",
    fields: 8,
    status: "Active",
    updated: "26 Aug 2026",
  },
  {
    id: 3,
    name: "Pilot Proposal Template",
    type: "Pilot",
    description:
      "Template for defining pilot objectives, milestones, resources and success metrics.",
    fields: 10,
    status: "Active",
    updated: "22 Aug 2026",
  },
  {
    id: 4,
    name: "Pilot Completion Report",
    type: "Pilot",
    description:
      "Template for documenting pilot outcomes, evidence and performance.",
    fields: 9,
    status: "Active",
    updated: "20 Aug 2026",
  },
  {
    id: 5,
    name: "Procurement Decision Template",
    type: "Decision",
    description:
      "Template for recording the final decision after evaluation and pilot completion.",
    fields: 7,
    status: "Inactive",
    updated: "15 Aug 2026",
  },
];

function AdminTemplates() {
  const navigate = useNavigate();

  const [templates, setTemplates] =
    useState(initialTemplates);

  const [selectedTemplate, setSelectedTemplate] =
    useState(null);

  const [showModal, setShowModal] =
    useState(false);

  const [editingTemplate, setEditingTemplate] =
    useState(null);

  const [deleteId, setDeleteId] =
    useState(null);

  const [typeFilter, setTypeFilter] =
    useState("All");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [form, setForm] = useState({
    name: "",
    type: "Challenge",
    description: "",
    fields: "",
    status: "Active",
  });

  const activeCount = templates.filter(
    (item) => item.status === "Active"
  ).length;

  const inactiveCount = templates.filter(
    (item) => item.status === "Inactive"
  ).length;

  const types = [
    "All",
    "Challenge",
    "Evaluation",
    "Pilot",
    "Decision",
  ];

  const filteredTemplates =
    templates.filter((template) => {
      const matchesType =
        typeFilter === "All" ||
        template.type === typeFilter;

      const matchesStatus =
        statusFilter === "All" ||
        template.status === statusFilter;

      return (
        matchesType &&
        matchesStatus
      );
    });

  const openAddModal = () => {
    setEditingTemplate(null);

    setForm({
      name: "",
      type: "Challenge",
      description: "",
      fields: "",
      status: "Active",
    });

    setShowModal(true);
  };

  const openEditModal = (template) => {
    setEditingTemplate(template);

    setForm({
      name: template.name,
      type: template.type,
      description: template.description,
      fields: String(template.fields),
      status: template.status,
    });

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
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

    if (
      !form.name.trim() ||
      !form.description.trim() ||
      !form.fields
    ) {
      return;
    }

    if (editingTemplate) {
      setTemplates((current) =>
        current.map((template) =>
          template.id ===
          editingTemplate.id
            ? {
                ...template,
                name: form.name.trim(),
                type: form.type,
                description:
                  form.description.trim(),
                fields: Number(form.fields),
                status: form.status,
                updated:
                  "31 Aug 2026",
              }
            : template
        )
      );
    } else {
      setTemplates((current) => [
        ...current,
        {
          id: Date.now(),
          name: form.name.trim(),
          type: form.type,
          description:
            form.description.trim(),
          fields: Number(form.fields),
          status: form.status,
          updated: "31 Aug 2026",
        },
      ]);
    }

    closeModal();
  };

  const duplicateTemplate = (template) => {
    const copyTemplate = {
      ...template,
      id: Date.now(),
      name: `${template.name} Copy`,
      status: "Inactive",
      updated: "31 Aug 2026",
    };

    setTemplates((current) => [
      ...current,
      copyTemplate,
    ]);
  };

  const toggleStatus = (id) => {
    setTemplates((current) =>
      current.map((template) =>
        template.id === id
          ? {
              ...template,
              status:
                template.status ===
                "Active"
                  ? "Inactive"
                  : "Active",
            }
          : template
      )
    );
  };

  const deleteTemplate = () => {
    setTemplates((current) =>
      current.filter(
        (template) =>
          template.id !== deleteId
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
            navigate("/admin")
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
                Templates
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Create and manage reusable templates
                used throughout the challenge,
                evaluation, pilot and decision
                workflows.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Create Template
          </button>
        </div>
      </section>

      {/* SUMMARY */}

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={FileText}
          title="Total Templates"
          value={templates.length}
        />

        <SummaryCard
          icon={ActiveIcon}
          title="Active Templates"
          value={activeCount}
          type="success"
        />

        <SummaryCard
          icon={InactiveIcon}
          title="Inactive Templates"
          value={inactiveCount}
          type="warning"
        />
      </section>

      {/* FILTERS */}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Template Library
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Manage reusable workflow templates.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target.value
                )
              }
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              {types.map((type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type === "All"
                    ? "All Types"
                    : type}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              <option value="All">
                All Status
              </option>

              <option value="Active">
                Active
              </option>

              <option value="Inactive">
                Inactive
              </option>
            </select>
          </div>
        </div>
      </section>

      {/* TEMPLATE GRID */}

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredTemplates.map(
          (template, index) => (
            <TemplateCard
              key={template.id}
              template={template}
              index={index}
              onView={() =>
                setSelectedTemplate(
                  template
                )
              }
              onEdit={() =>
                openEditModal(template)
              }
              onDuplicate={() =>
                duplicateTemplate(
                  template
                )
              }
              onToggle={() =>
                toggleStatus(
                  template.id
                )
              }
              onDelete={() =>
                setDeleteId(
                  template.id
                )
              }
            />
          )
        )}
      </section>

      {/* EMPTY */}

      {filteredTemplates.length === 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-950">
          <FileText className="mx-auto h-8 w-8 text-slate-300" />

          <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">
            No templates found
          </h3>

          <p className="mt-1 text-xs text-slate-400">
            Try changing your filters or create
            a new template.
          </p>
        </section>
      )}

      {/* VIEW MODAL */}

      {selectedTemplate && (
        <PreviewModal
          template={selectedTemplate}
          onClose={() =>
            setSelectedTemplate(null)
          }
        />
      )}

      {/* ADD / EDIT */}

      {showModal && (
        <TemplateModal
          form={form}
          editing={editingTemplate}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onClose={closeModal}
        />
      )}

      {/* DELETE */}

      {deleteId && (
        <DeleteModal
          onClose={() =>
            setDeleteId(null)
          }
          onConfirm={deleteTemplate}
        />
      )}
    </motion.div>
  );
}

/* ===================================================== */
/* SUMMARY CARD                                          */
/* ===================================================== */

function SummaryCard({
  icon: Icon,
  title,
  value,
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
/* TEMPLATE CARD                                         */
/* ===================================================== */

function TemplateCard({
  template,
  index,
  onView,
  onEdit,
  onDuplicate,
  onToggle,
  onDelete,
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay: index * 0.05,
      }}
      className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
          <FileText className="h-5 w-5" />
        </div>

        <TemplateStatus
          status={template.status}
        />
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {template.name}
          </h3>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span className="rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            {template.type}
          </span>

          <span className="text-[9px] text-slate-400">
            {template.fields} fields
          </span>
        </div>

        <p className="mt-4 min-h-[60px] text-xs leading-5 text-slate-500 dark:text-slate-400">
          {template.description}
        </p>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
        <p className="text-[9px] text-slate-400">
          Last updated: {template.updated}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <ActionButton
            icon={Eye}
            text="Preview"
            onClick={onView}
          />

          <ActionButton
            icon={Edit3}
            text="Edit"
            onClick={onEdit}
          />

          <ActionButton
            icon={Copy}
            text="Duplicate"
            onClick={onDuplicate}
          />

          <ActionButton
            icon={
              template.status === "Active"
                ? InactiveIcon
                : ActiveIcon
            }
            text={
              template.status === "Active"
                ? "Disable"
                : "Activate"
            }
            onClick={onToggle}
          />
        </div>

        <button
          type="button"
          onClick={onDelete}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-100 py-2.5 text-[10px] font-bold text-red-500 hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-500/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Template
        </button>
      </div>
    </motion.div>
  );
}

/* ===================================================== */
/* ACTION BUTTON                                         */
/* ===================================================== */

function ActionButton({
  icon: Icon,
  text,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2 py-2.5 text-[9px] font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-indigo-400"
    >
      <Icon className="h-3.5 w-3.5" />
      {text}
    </button>
  );
}

/* ===================================================== */
/* STATUS                                                */
/* ===================================================== */

function TemplateStatus({
  status,
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${
        status === "Active"
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
      }`}
    >
      {status}
    </span>
  );
}

/* ===================================================== */
/* TEMPLATE MODAL                                        */
/* ===================================================== */

function TemplateModal({
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
              Template Management
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
              {editing
                ? "Edit Template"
                : "Create Template"}
            </h2>
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
          <FormField
            label="Template Name"
            name="name"
            value={form.name}
            onChange={onChange}
            placeholder="e.g. Startup Application Template"
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                Template Type
              </label>

              <select
                name="type"
                value={form.type}
                onChange={onChange}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                <option value="Challenge">
                  Challenge
                </option>

                <option value="Evaluation">
                  Evaluation
                </option>

                <option value="Pilot">
                  Pilot
                </option>

                <option value="Decision">
                  Decision
                </option>
              </select>
            </div>

            <FormField
              label="Number of Fields"
              name="fields"
              type="number"
              min="1"
              value={form.fields}
              onChange={onChange}
              placeholder="10"
              required
            />
          </div>

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
              placeholder="Describe the purpose of this template..."
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            />
          </div>

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
                : "Create Template"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ===================================================== */
/* FORM FIELD                                            */
/* ===================================================== */

function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  min,
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
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
      />
    </div>
  );
}

/* ===================================================== */
/* PREVIEW MODAL                                         */
/* ===================================================== */

function PreviewModal({
  template,
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
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Eye className="h-5 w-5" />
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-500">
                Template Preview
              </p>

              <h2 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                {template.name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <PreviewItem
            label="Template Type"
            value={template.type}
          />

          <PreviewItem
            label="Status"
            value={template.status}
          />

          <PreviewItem
            label="Number of Fields"
            value={`${template.fields} fields`}
          />

          <PreviewItem
            label="Description"
            value={template.description}
          />

          <PreviewItem
            label="Last Updated"
            value={template.updated}
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 text-[10px] font-bold text-white hover:bg-indigo-700"
        >
          Close Preview
        </button>
      </motion.div>
    </div>
  );
}

/* ===================================================== */
/* PREVIEW ITEM                                          */
/* ===================================================== */

function PreviewItem({
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xs font-semibold leading-5 text-slate-700 dark:text-slate-200">
        {value}
      </p>
    </div>
  );
}

/* ===================================================== */
/* DELETE MODAL                                           */
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
          Delete this template?
        </h2>

        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          This template will be removed from the
          template library.
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
/* ICONS                                                  */
/* ===================================================== */

function ActiveIcon({
  className = "h-5 w-5",
}) {
  return (
    <CheckIcon
      className={className}
    />
  );
}

function InactiveIcon({
  className = "h-5 w-5",
}) {
  return (
    <XIcon
      className={className}
    />
  );
}

function CheckIcon({
  className,
}) {
  return (
    <span
      className={`${className} flex items-center justify-center font-bold`}
    >
      ✓
    </span>
  );
}

function XIcon({
  className,
}) {
  return (
    <span
      className={`${className} flex items-center justify-center font-bold`}
    >
      ×
    </span>
  );
}

export default AdminTemplates;