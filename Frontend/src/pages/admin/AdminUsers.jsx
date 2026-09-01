import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  Building2,
  UserRound,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const initialUsers = [
  {
    id: 1,
    name: "GreenTech Innovations",
    email: "contact@greentech.in",
    role: "Startup",
    organization: "GreenTech Innovations Pvt. Ltd.",
    status: "Active",
    verified: true,
    joined: "12 Aug 2026",
  },
  {
    id: 2,
    name: "Department of Urban Development",
    email: "urban@gov.in",
    role: "Government",
    organization: "Department of Urban Development",
    status: "Active",
    verified: true,
    joined: "10 Aug 2026",
  },
  {
    id: 3,
    name: "Dr. Ananya Sharma",
    email: "ananya@example.com",
    role: "Evaluator",
    organization: "Innovation Evaluation Board",
    status: "Active",
    verified: true,
    joined: "08 Aug 2026",
  },
  {
    id: 4,
    name: "EcoVision Technologies",
    email: "hello@ecovision.in",
    role: "Startup",
    organization: "EcoVision Technologies",
    status: "Pending",
    verified: false,
    joined: "28 Aug 2026",
  },
  {
    id: 5,
    name: "Rajesh Kumar",
    email: "rajesh@example.com",
    role: "Evaluator",
    organization: "Technical Evaluation Committee",
    status: "Active",
    verified: true,
    joined: "05 Aug 2026",
  },
  {
    id: 6,
    name: "Department of Transport",
    email: "transport@gov.in",
    role: "Government",
    organization: "State Transport Department",
    status: "Active",
    verified: true,
    joined: "02 Aug 2026",
  },
  {
    id: 7,
    name: "SmartInfra Labs",
    email: "info@smartinfra.in",
    role: "Startup",
    organization: "SmartInfra Labs Pvt. Ltd.",
    status: "Inactive",
    verified: true,
    joined: "25 Jul 2026",
  },
  {
    id: 8,
    name: "Priya Mehta",
    email: "priya@example.com",
    role: "Evaluator",
    organization: "Public Procurement Evaluation Cell",
    status: "Pending",
    verified: false,
    joined: "30 Aug 2026",
  },
];

function AdminUsers() {
  const navigate = useNavigate();

  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem("setugov_users");
      return saved ? JSON.parse(saved) : initialUsers;
    } catch {
      return initialUsers;
    }
  });

  useEffect(() => {
    localStorage.setItem("setugov_users", JSON.stringify(users));
  }, [users]);

  const [search, setSearch] =
    useState("");

  const [roleFilter, setRoleFilter] =
    useState("All");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [selectedUser, setSelectedUser] =
    useState(null);

  const [openMenu, setOpenMenu] =
    useState(null);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchText =
        search.toLowerCase();

      const matchesSearch =
        user.name
          .toLowerCase()
          .includes(searchText) ||
        user.email
          .toLowerCase()
          .includes(searchText) ||
        user.organization
          .toLowerCase()
          .includes(searchText);

      const matchesRole =
        roleFilter === "All" ||
        user.role === roleFilter;

      const matchesStatus =
        statusFilter === "All" ||
        user.status === statusFilter;

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus
      );
    });
  }, [
    users,
    search,
    roleFilter,
    statusFilter,
  ]);

  const handleToggleStatus = (id) => {
    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === id
          ? {
              ...user,
              status:
                user.status === "Active"
                  ? "Inactive"
                  : "Active",
            }
          : user
      )
    );

    setOpenMenu(null);
  };

  const handleVerify = (id) => {
    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === id
          ? {
              ...user,
              verified: true,
              status: "Active",
            }
          : user
      )
    );

    setOpenMenu(null);
  };

  const totalUsers = users.length;

  const activeUsers = users.filter(
    (user) => user.status === "Active"
  ).length;

  const pendingUsers = users.filter(
    (user) => user.status === "Pending"
  ).length;

  const verifiedUsers = users.filter(
    (user) => user.verified
  ).length;

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
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin Dashboard
        </button>

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Users className="h-6 w-6" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Administration
              </p>

              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                User Management
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Manage government officers, startups,
                evaluators and other platform users.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Showing
            </p>

            <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
              {filteredUsers.length} of {totalUsers} users
            </p>
          </div>
        </div>
      </section>

      {/* SUMMARY */}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Users}
          title="Total Users"
          value={totalUsers}
        />

        <SummaryCard
          icon={UserCheck}
          title="Active Users"
          value={activeUsers}
          type="success"
        />

        <SummaryCard
          icon={ShieldCheck}
          title="Verified Users"
          value={verifiedUsers}
          type="verified"
        />

        <SummaryCard
          icon={UserX}
          title="Pending"
          value={pendingUsers}
          type="warning"
        />
      </section>

      {/* USERS TABLE */}

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
                placeholder="Search name, email or organization..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-xs outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex">
              <select
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(
                    event.target.value
                  )
                }
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                <option value="All">
                  All Roles
                </option>

                <option value="Government">
                  Government
                </option>

                <option value="Startup">
                  Startup
                </option>

                <option value="Evaluator">
                  Evaluator
                </option>

                <option value="Admin">
                  Admin
                </option>
              </select>

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

                <option value="Active">
                  Active
                </option>

                <option value="Inactive">
                  Inactive
                </option>

                <option value="Pending">
                  Pending
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* TABLE */}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/50">
                <th className="px-6 py-4 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  User
                </th>

                <th className="px-6 py-4 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Role
                </th>

                <th className="px-6 py-4 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Status
                </th>

                <th className="px-6 py-4 text-left text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Verification
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
              {filteredUsers.map(
                (user, index) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    index={index}
                    openMenu={openMenu}
                    setOpenMenu={setOpenMenu}
                    onView={() =>
                      setSelectedUser(user)
                    }
                    onVerify={() =>
                      handleVerify(user.id)
                    }
                    onToggleStatus={() =>
                      handleToggleStatus(
                        user.id
                      )
                    }
                  />
                )
              )}
            </tbody>
          </table>
        </div>

        {/* EMPTY */}

        {filteredUsers.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-900">
              <Users className="h-6 w-6" />
            </div>

            <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">
              No users found
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Try changing your search or filters.
            </p>
          </div>
        )}
      </section>

      {/* USER MODAL */}

      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() =>
            setSelectedUser(null)
          }
          onToggleStatus={() => {
            handleToggleStatus(
              selectedUser.id
            );

            setSelectedUser({
              ...selectedUser,
              status:
                selectedUser.status ===
                "Active"
                  ? "Inactive"
                  : "Active",
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

  if (type === "verified") {
    iconClass =
      "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400";
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
/* USER ROW                                              */
/* ===================================================== */

function UserRow({
  user,
  index,
  openMenu,
  setOpenMenu,
  onView,
  onVerify,
  onToggleStatus,
}) {
  const getIcon = () => {
    if (user.role === "Startup") {
      return Building2;
    }

    if (user.role === "Government") {
      return ShieldCheck;
    }

    return UserRound;
  };

  const Icon = getIcon();

  return (
    <motion.tr
      initial={{
        opacity: 0,
      }}
      animate={{
        opacity: 1,
      }}
      transition={{
        delay: index * 0.03,
      }}
      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-900/50"
    >
      {/* USER */}

      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <Icon className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <p className="max-w-[250px] truncate text-xs font-bold text-slate-800 dark:text-slate-200">
              {user.name}
            </p>

            <p className="mt-1 max-w-[250px] truncate text-[9px] text-slate-400">
              {user.email}
            </p>

            <p className="mt-1 max-w-[250px] truncate text-[9px] text-slate-400">
              {user.organization}
            </p>
          </div>
        </div>
      </td>

      {/* ROLE */}

      <td className="px-6 py-4">
        <RoleBadge role={user.role} />
      </td>

      {/* STATUS */}

      <td className="px-6 py-4">
        <StatusBadge status={user.status} />
      </td>

      {/* VERIFICATION */}

      <td className="px-6 py-4">
        {user.verified ? (
          <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-amber-600 dark:text-amber-400">
            <XCircle className="h-3.5 w-3.5" />
            Pending
          </span>
        )}
      </td>

      {/* DATE */}

      <td className="px-6 py-4 text-[10px] text-slate-400">
        {user.joined}
      </td>

      {/* ACTION */}

      <td className="relative px-6 py-4 text-right">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();

            setOpenMenu(
              openMenu === user.id
                ? null
                : user.id
            );
          }}
          className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-white"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {openMenu === user.id && (
          <div
            className="absolute right-6 top-12 z-20 w-44 rounded-2xl border border-slate-200 bg-white p-1.5 text-left shadow-xl dark:border-slate-800 dark:bg-slate-950"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <MenuButton
              icon={Eye}
              text="View Details"
              onClick={onView}
            />

            {!user.verified && (
              <MenuButton
                icon={CheckCircle2}
                text="Verify User"
                onClick={onVerify}
              />
            )}

            <MenuButton
              icon={
                user.status === "Active"
                  ? UserX
                  : UserCheck
              }
              text={
                user.status === "Active"
                  ? "Deactivate"
                  : "Activate"
              }
              onClick={onToggleStatus}
            />
          </div>
        )}
      </td>
    </motion.tr>
  );
}

/* ===================================================== */
/* ROLE BADGE                                            */
/* ===================================================== */

function RoleBadge({
  role,
}) {
  const classes = {
    Startup:
      "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
    Government:
      "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    Evaluator:
      "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
    Admin:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold ${
        classes[role] || classes.Admin
      }`}
    >
      {role}
    </span>
  );
}

/* ===================================================== */
/* STATUS BADGE                                          */
/* ===================================================== */

function StatusBadge({
  status,
}) {
  const classes = {
    Active:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    Inactive:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    Pending:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
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
/* USER DETAILS MODAL                                    */
/* ===================================================== */

function UserDetailsModal({
  user,
  onClose,
  onToggleStatus,
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
              <UserRound className="h-5 w-5" />
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-500">
                User Details
              </p>

              <h2 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                {user.name}
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
          <Detail
            label="Email"
            value={user.email}
          />

          <Detail
            label="Organization"
            value={user.organization}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Detail
              label="Role"
              value={user.role}
            />

            <Detail
              label="Status"
              value={user.status}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Detail
              label="Verification"
              value={
                user.verified
                  ? "Verified"
                  : "Pending"
              }
            />

            <Detail
              label="Joined"
              value={user.joined}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onToggleStatus}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-[10px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            {user.status === "Active"
              ? "Deactivate User"
              : "Activate User"}
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

export default AdminUsers;