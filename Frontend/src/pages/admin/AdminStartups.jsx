import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  FileCheck2,
  FileText,
  ExternalLink,
  MoreVertical,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  X,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getStartupDocuments } from "../../services/startupService.js";

const initialStartups = [
  {
    id: 1,
    name: "GreenTech Innovations",
    founder: "Rahul Verma",
    email: "contact@greentech.in",
    category: "Clean Technology",
    gst: "20ABCDE1234F1Z5",
    status: "Verified",
    joined: "12 Aug 2026",
  },
  {
    id: 2,
    name: "EcoVision Technologies",
    founder: "Priya Mehta",
    email: "hello@ecovision.in",
    category: "Waste Management",
    gst: "20EFGHI5678J1Z2",
    status: "Pending",
    joined: "28 Aug 2026",
  },
  {
    id: 3,
    name: "SmartInfra Labs",
    founder: "Amit Kumar",
    email: "info@smartinfra.in",
    category: "Infrastructure",
    gst: "20KLMNO9012P1Z8",
    status: "Verified",
    joined: "25 Jul 2026",
  },
  {
    id: 4,
    name: "AgroNext Solutions",
    founder: "Sneha Singh",
    email: "contact@agronext.in",
    category: "Agriculture",
    gst: "20QRSTU3456V1Z4",
    status: "Verified",
    joined: "21 Jul 2026",
  },
  {
    id: 5,
    name: "Urban Mobility Labs",
    founder: "Arjun Rao",
    email: "hello@urbanmobility.in",
    category: "Smart Mobility",
    gst: "20WXYZA7890B1Z6",
    status: "Suspended",
    joined: "18 Jul 2026",
  },
  {
    id: 6,
    name: "HealthGrid Technologies",
    founder: "Neha Sharma",
    email: "team@healthgrid.in",
    category: "Healthcare",
    gst: "20CDEFG2345H1Z9",
    status: "Pending",
    joined: "30 Aug 2026",
  },
  {
    id: 7,
    name: "WaterSense AI",
    founder: "Vikash Gupta",
    email: "info@watersense.in",
    category: "Water Management",
    gst: "20IJKLM6789N1Z3",
    status: "Verified",
    joined: "15 Jul 2026",
  },
  {
    id: 8,
    name: "SolarEdge Innovations",
    founder: "Karan Malhotra",
    email: "contact@solaredge.in",
    category: "Renewable Energy",
    gst: "20OPQRS0123T1Z7",
    status: "Verified",
    joined: "10 Jul 2026",
  },
];

function AdminStartups() {
  const navigate = useNavigate();

  const [startups, setStartups] = useState(() => {
    try {
      const saved = localStorage.getItem("setugov_startups");
      return saved ? JSON.parse(saved) : initialStartups;
    } catch {
      return initialStartups;
    }
  });

  useEffect(() => {
    localStorage.setItem("setugov_startups", JSON.stringify(startups));
  }, [startups]);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [categoryFilter, setCategoryFilter] =
    useState("All");

  const [openMenu, setOpenMenu] =
    useState(null);

  const [selectedStartup, setSelectedStartup] =
    useState(null);

  const categories = [
    "All",
    ...new Set(
      initialStartups.map(
        (startup) => startup.category
      )
    ),
  ];

  const filteredStartups = useMemo(() => {
    return startups.filter((startup) => {
      const searchText =
        search.toLowerCase();

      const matchesSearch =
        startup.name
          .toLowerCase()
          .includes(searchText) ||
        startup.founder
          .toLowerCase()
          .includes(searchText) ||
        startup.email
          .toLowerCase()
          .includes(searchText) ||
        startup.category
          .toLowerCase()
          .includes(searchText);

      const matchesStatus =
        statusFilter === "All" ||
        startup.status === statusFilter;

      const matchesCategory =
        categoryFilter === "All" ||
        startup.category === categoryFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory
      );
    });
  }, [
    startups,
    search,
    statusFilter,
    categoryFilter,
  ]);

  const verifiedCount = startups.filter(
    (startup) => startup.status === "Verified"
  ).length;

  const pendingCount = startups.filter(
    (startup) => startup.status === "Pending"
  ).length;

  const suspendedCount = startups.filter(
    (startup) => startup.status === "Suspended"
  ).length;

  const handleVerify = (id) => {
    setStartups((current) =>
      current.map((startup) =>
        startup.id === id
          ? {
              ...startup,
              status: "Verified",
            }
          : startup
      )
    );

    setOpenMenu(null);
  };

  const handleToggleSuspend = (id) => {
    setStartups((current) =>
      current.map((startup) =>
        startup.id === id
          ? {
              ...startup,
              status:
                startup.status === "Suspended"
                  ? "Verified"
                  : "Suspended",
            }
          : startup
      )
    );

    setOpenMenu(null);
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
      onClick={() => setOpenMenu(null)}
    >
      {/* HEADER */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            navigate("/admin/dashboard");
          }}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin Dashboard
        </button>

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Building2 className="h-6 w-6" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Administration
              </p>

              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Startup Management
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Review, verify and manage startups
                registered on the platform.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Total Startups
            </p>

            <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
              {startups.length}
            </p>
          </div>
        </div>
      </section>

      {/* SUMMARY */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Building2}
          title="Total Startups"
          value={startups.length}
        />

        <SummaryCard
          icon={CheckCircle2}
          title="Verified"
          value={verifiedCount}
          type="success"
        />

        <SummaryCard
          icon={FileCheck2}
          title="Pending Verification"
          value={pendingCount}
          type="warning"
        />

        <SummaryCard
          icon={UserX}
          title="Suspended"
          value={suspendedCount}
          type="danger"
        />
      </section>

      {/* STARTUP TABLE */}

      <section
        className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        {/* FILTERS */}

        <div className="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative w-full xl:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search startup, founder, email..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-xs outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                <option value="All">
                  All Status
                </option>

                <option value="Verified">
                  Verified
                </option>

                <option value="Pending">
                  Pending
                </option>

                <option value="Suspended">
                  Suspended
                </option>
              </select>

              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(
                    event.target.value
                  )
                }
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                {categories.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category === "All"
                        ? "All Categories"
                        : category}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </div>

        {/* TABLE */}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/50">
                <th className="px-6 py-4 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Startup
                </th>

                <th className="px-6 py-4 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Category
                </th>

                <th className="px-6 py-4 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  GST
                </th>

                <th className="px-6 py-4 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Status
                </th>

                <th className="px-6 py-4 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Joined
                </th>

                <th className="px-6 py-4 text-right text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredStartups.map(
                (startup, index) => (
                  <StartupRow
                    key={startup.id}
                    startup={startup}
                    index={index}
                    openMenu={openMenu}
                    setOpenMenu={setOpenMenu}
                    onView={() =>
                      setSelectedStartup(
                        startup
                      )
                    }
                    onVerify={() =>
                      handleVerify(
                        startup.id
                      )
                    }
                    onToggleSuspend={() =>
                      handleToggleSuspend(
                        startup.id
                      )
                    }
                  />
                )
              )}
            </tbody>
          </table>
        </div>

        {/* EMPTY STATE */}

        {filteredStartups.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-900">
              <Building2 className="h-6 w-6" />
            </div>

            <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">
              No startups found
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Try changing your search or filters.
            </p>
          </div>
        )}
      </section>

      {/* DETAILS MODAL */}

      {selectedStartup && (
        <StartupDetailsModal
          startup={selectedStartup}
          onClose={() =>
            setSelectedStartup(null)
          }
          onToggleSuspend={() => {
            handleToggleSuspend(
              selectedStartup.id
            );

            setSelectedStartup({
              ...selectedStartup,
              status:
                selectedStartup.status ===
                "Suspended"
                  ? "Verified"
                  : "Suspended",
            });
          }}
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

  if (type === "danger") {
    iconClass =
      "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400";
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
/* STARTUP ROW                                           */
/* ===================================================== */

function StartupRow({
  startup,
  index,
  openMenu,
  setOpenMenu,
  onView,
  onVerify,
  onToggleSuspend,
}) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        delay: index * 0.03,
      }}
      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-900/50"
    >
      {/* STARTUP */}

      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Building2 className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <p className="max-w-[230px] truncate text-xs font-bold text-slate-800 dark:text-slate-200">
              {startup.name}
            </p>

            <p className="mt-1 text-[9px] text-slate-400">
              Founder: {startup.founder}
            </p>

            <p className="mt-1 max-w-[230px] truncate text-[9px] text-slate-400">
              {startup.email}
            </p>
          </div>
        </div>
      </td>

      {/* CATEGORY */}

      <td className="px-6 py-4">
        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
          {startup.category}
        </span>
      </td>

      {/* GST */}

      <td className="px-6 py-4">
        <span className="font-mono text-[9px] text-slate-400">
          {startup.gst}
        </span>
      </td>

      {/* STATUS */}

      <td className="px-6 py-4">
        <StatusBadge
          status={startup.status}
        />
      </td>

      {/* DATE */}

      <td className="px-6 py-4 text-[10px] text-slate-400">
        {startup.joined}
      </td>

      {/* ACTION */}

      <td className="relative px-6 py-4 text-right">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();

            setOpenMenu(
              openMenu === startup.id
                ? null
                : startup.id
            );
          }}
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-white"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {openMenu === startup.id && (
          <div
            className="absolute right-6 top-12 z-20 w-48 rounded-2xl border border-slate-200 bg-white p-1.5 text-left shadow-xl dark:border-slate-800 dark:bg-slate-950"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <MenuButton
              icon={Eye}
              text="View Details"
              onClick={onView}
            />

            {startup.status === "Pending" && (
              <MenuButton
                icon={CheckCircle2}
                text="Verify Startup"
                onClick={onVerify}
              />
            )}

            <MenuButton
              icon={
                startup.status === "Suspended"
                  ? UserCheck
                  : UserX
              }
              text={
                startup.status === "Suspended"
                  ? "Activate Startup"
                  : "Suspend Startup"
              }
              onClick={onToggleSuspend}
            />
          </div>
        )}
      </td>
    </motion.tr>
  );
}

/* ===================================================== */
/* STATUS BADGE                                          */
/* ===================================================== */

function StatusBadge({
  status,
}) {
  const classes = {
    Verified:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",

    Pending:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",

    Suspended:
      "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold ${
        classes[status]
      }`}
    >
      {status}
    </span>
  );
}

/* ===================================================== */
/* MENU BUTTON                                           */
/* ===================================================== */

function MenuButton({
  icon: Icon,
  text,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-indigo-400"
    >
      <Icon className="h-3.5 w-3.5" />
      {text}
    </button>
  );
}

/* ===================================================== */
/* STARTUP DETAILS MODAL                                 */
/* ===================================================== */

function StartupDetailsModal({
  startup,
  onClose,
  onToggleSuspend,
}) {
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (startup?.id) {
      setLoadingDocs(true);
      getStartupDocuments(startup.id)
        .then((res) => {
          if (mounted) {
            setDocuments(res?.data?.documents || []);
          }
        })
        .catch((err) => console.warn("Admin startup docs fetch:", err))
        .finally(() => {
          if (mounted) setLoadingDocs(false);
        });
    }
    return () => { mounted = false; };
  }, [startup?.id]);

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
        {/* MODAL HEADER */}

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Building2 className="h-5 w-5" />
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-500">
                Startup Details
              </p>

              <h2 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                {startup.name}
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

        {/* DETAILS */}

        <div className="mt-6 space-y-3">
          <Detail
            label="Founder"
            value={startup.founder}
          />

          <Detail
            label="Email"
            value={startup.email}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Detail
              label="Category"
              value={startup.category}
            />

            <Detail
              label="Status"
              value={startup.status}
            />
          </div>

          <Detail
            label="GST Number"
            value={startup.gst}
          />

          <Detail
            label="Registration Date"
            value={startup.joined}
          />
        </div>

        {/* SUBMITTED VERIFICATION DOCUMENTS */}

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Submitted Verification Documents
            </p>
            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
              {documents.length} File(s)
            </span>
          </div>

          {loadingDocs ? (
            <p className="mt-2 text-xs text-slate-400">Loading documents...</p>
          ) : documents.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">No verification documents uploaded yet.</p>
          ) : (
            <div className="mt-3 space-y-2 max-h-40 overflow-y-auto pr-1">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                    <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {doc.document_type?.replace(/_/g, " ")}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (doc.document_url) {
                        window.open(doc.document_url, "_blank", "noopener,noreferrer");
                      }
                    }}
                    className="inline-flex items-center gap-1 shrink-0 rounded-lg bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View File
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ACTIONS */}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onToggleSuspend}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-[10px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            {startup.status === "Suspended"
              ? "Activate Startup"
              : "Suspend Startup"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-[10px] font-bold text-white hover:bg-indigo-700"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ===================================================== */
/* DETAIL                                                */
/* ===================================================== */

function Detail({
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-xs font-bold text-slate-700 dark:text-slate-200">
        {value}
      </p>
    </div>
  );
}

export default AdminStartups;