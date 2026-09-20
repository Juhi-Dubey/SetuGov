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
  Clock,
  Eye,
  X,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getUsers, updateUserStatus, updateUserRole, verifyEvaluator } from "../../services/adminService";
import Pagination from "../../components/common/Pagination";

function AdminUsers() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await getUsers();
      const list = res?.data?.users || res?.data || [];
      const mapped = list.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role === "GOVERNMENT" ? "Government" : u.role === "STARTUP" ? "Startup" : u.role === "EVALUATOR" ? "Evaluator" : "Admin",
        organization: u.department?.name || (u.role === "STARTUP" ? "Startup Enterprise" : "SetuGov Administration"),
        status: u.is_active ? "Active" : "Inactive",
        is_active: u.is_active,
        verified: u.is_verified,
        joined: u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN") : "Recent",
      }));
      setUsers(mapped);
    } catch (err) {
      console.error("Failed to load users from backend:", err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedUser, setSelectedUser] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, statusFilter]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        user.name.toLowerCase().includes(searchText) ||
        user.email.toLowerCase().includes(searchText) ||
        user.organization?.toLowerCase().includes(searchText);

      const matchesRole =
        roleFilter === "All" || user.role === roleFilter;

      const matchesStatus =
        statusFilter === "All" || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const handleToggleStatus = async (id) => {
    const target = users.find((u) => u.id === id);
    if (!target) return;
    try {
      await updateUserStatus(id, !target.is_active);
      loadUsers();
    } catch (err) {
      alert(`Error updating user status: ${err.message}`);
    }
    setOpenMenu(null);
  };

  const handleVerify = (id) => {
    handleToggleStatus(id);
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
          className="back-nav"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin Dashboard
        </button>

        <div className="mt-2 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Users className="h-6 w-6" />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Administration
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Government Users & Platform Directory
            </h1>

            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Govern government nodal officers, department affiliations, and verified user accounts across the platform.
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
          icon={Clock}
          title="Pending Verification"
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

        <div className="border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-xs md:max-w-sm">
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
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <select
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(
                    event.target.value
                  )
                }
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
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
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
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
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  User
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Role
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Status
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Verification
                </th>

                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Joined
                </th>

                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedUsers.map(
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

      {/* PAGINATION */}
      <Pagination
        currentPage={currentPage}
        totalItems={filteredUsers.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        itemName="users"
      />

      {/* USER MODAL */}

      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() =>
            setSelectedUser(null)
          }
          onRoleChange={() => {
            loadUsers();
            setSelectedUser(null);
          }}
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

      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
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

      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <Icon className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 dark:text-white" title={user.name}>
              {user.name}
            </p>

            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="truncate max-w-[220px]">{user.email}</span>
              {user.organization && (
                <>
                  <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">•</span>
                  <span className="truncate max-w-[200px]">{user.organization}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* ROLE */}

      <td className="px-5 py-3">
        <RoleBadge role={user.role} />
      </td>

      {/* STATUS */}

      <td className="px-5 py-3">
        <StatusBadge status={user.status} />
      </td>

      {/* VERIFICATION */}

      <td className="px-5 py-3">
        {user.verified ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            <Clock className="h-3.5 w-3.5" />
            Pending
          </span>
        )}
      </td>

      {/* DATE */}

      <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400">
        {user.joined}
      </td>

      {/* ACTION */}

      <td className="relative px-5 py-3 text-right">
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
      "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
    Government:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
    Evaluator:
      "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
    Admin:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
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
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    Inactive:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    Pending:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        classes[status] || classes.Inactive
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
  onRoleChange,
}) {
  const [selectedRole, setSelectedRole] = useState(
    user.role === "Government" ? "GOVERNMENT" : user.role === "Startup" ? "STARTUP" : user.role === "Evaluator" ? "EVALUATOR" : "ADMIN"
  );
  const [updatingRole, setUpdatingRole] = useState(false);

  const handleSaveRole = async () => {
    try {
      setUpdatingRole(true);
      await updateUserRole(user.id, selectedRole);
      if (onRoleChange) onRoleChange(user.id, selectedRole);
      alert(`User role updated to ${selectedRole} successfully!`);
    } catch (err) {
      alert(`Error updating role: ${err.message}`);
    } finally {
      setUpdatingRole(false);
    }
  };

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
                User Details & Role Governance
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

          {/* ROLE MODIFICATION */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 dark:border-indigo-900/40 dark:bg-indigo-950/20">
            <label className="text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              Platform Role Assignment
            </label>
            <div className="mt-2 flex items-center gap-2">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="h-9 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-900 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              >
                <option value="STARTUP">Startup Innovator</option>
                <option value="GOVERNMENT">Government Procurement Officer</option>
                <option value="EVALUATOR">Technical / Financial Evaluator</option>
                <option value="ADMIN">System Administrator</option>
              </select>
              <button
                type="button"
                onClick={handleSaveRole}
                disabled={updatingRole}
                className="h-9 rounded-xl bg-indigo-600 px-3.5 text-xs font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {updatingRole ? "Saving..." : "Change Role"}
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Detail
              label="Status"
              value={user.status}
            />

            <Detail
              label="Verification"
              value={
                user.verified
                  ? "Verified"
                  : "Pending"
              }
            />
          </div>

          <Detail
            label="Joined"
            value={user.joined}
          />
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onToggleStatus}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 transition"
          >
            {user.status === "Active"
              ? "Deactivate User"
              : "Activate User"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 transition"
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
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-xs font-semibold text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

export default AdminUsers;