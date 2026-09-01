import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  Building2,
  CalendarDays,
  ChevronDown,
  Clock3,
  IndianRupee,
  Search,
  Sparkles,
  Users,
  X,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const challenges = [
  {
    id: 1,
    title: "AI-Based Citizen Grievance Management",
    department: "Department of Public Services",
    category: "Artificial Intelligence",
    description:
      "Develop an intelligent platform to classify, route and track citizen grievances using AI.",
    budget: "₹25 Lakhs",
    deadline: "05 Sep 2026",
    applicants: 18,
    status: "Open",
    daysLeft: 5,
  },
  {
    id: 2,
    title: "Smart Waste Collection System",
    department: "Urban Development Department",
    category: "Smart City",
    description:
      "Build a technology-driven solution for optimized waste collection and monitoring.",
    budget: "₹40 Lakhs",
    deadline: "12 Sep 2026",
    applicants: 24,
    status: "Open",
    daysLeft: 12,
  },
  {
    id: 3,
    title: "Digital Healthcare Access Platform",
    department: "Department of Health",
    category: "Healthcare",
    description:
      "Create a digital platform that improves access to government healthcare services.",
    budget: "₹35 Lakhs",
    deadline: "15 Sep 2026",
    applicants: 11,
    status: "Open",
    daysLeft: 15,
  },
  {
    id: 4,
    title: "Agricultural Market Intelligence",
    department: "Department of Agriculture",
    category: "Agriculture",
    description:
      "Develop a data-driven platform providing farmers with market and crop intelligence.",
    budget: "₹30 Lakhs",
    deadline: "20 Sep 2026",
    applicants: 9,
    status: "Open",
    daysLeft: 20,
  },
  {
    id: 5,
    title: "Digital Public Transport Monitoring",
    department: "Transport Department",
    category: "Transportation",
    description:
      "Develop a real-time monitoring solution for public transportation services.",
    budget: "₹50 Lakhs",
    deadline: "28 Sep 2026",
    applicants: 31,
    status: "Open",
    daysLeft: 28,
  },
  {
    id: 6,
    title: "Government Document Intelligence",
    department: "Department of Administration",
    category: "Artificial Intelligence",
    description:
      "Create an AI-powered system for document classification, extraction and processing.",
    budget: "₹20 Lakhs",
    deadline: "02 Oct 2026",
    applicants: 14,
    status: "Open",
    daysLeft: 32,
  },
];

const categories = [
  "All Categories",
  "Artificial Intelligence",
  "Smart City",
  "Healthcare",
  "Agriculture",
  "Transportation",
];

function StartupChallenges() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [search, setSearch] = useState("");
  const [category, setCategory] =
    useState("All Categories");
  const [sortBy, setSortBy] =
    useState("deadline");
  const [selectedChallenge, setSelectedChallenge] =
    useState(null);

  useEffect(() => {
    if (id) {
      const match = challenges.find(
        (c) => String(c.id) === String(id)
      );
      if (match) {
        setSelectedChallenge(match);
      }
    }
  }, [id]);

  const filteredChallenges = useMemo(() => {
    let result = challenges.filter((challenge) => {
      const searchText = search.toLowerCase().trim();

      const matchesSearch =
        !searchText ||
        challenge.title
          .toLowerCase()
          .includes(searchText) ||
        challenge.department
          .toLowerCase()
          .includes(searchText) ||
        challenge.category
          .toLowerCase()
          .includes(searchText);

      const matchesCategory =
        category === "All Categories" ||
        challenge.category === category;

      return (
        matchesSearch && matchesCategory
      );
    });

    if (sortBy === "deadline") {
      result.sort(
        (a, b) => a.daysLeft - b.daysLeft
      );
    }

    if (sortBy === "budget") {
      result.sort(
        (a, b) =>
          extractBudget(b.budget) -
          extractBudget(a.budget)
      );
    }

    if (sortBy === "applicants") {
      result.sort(
        (a, b) =>
          b.applicants - a.applicants
      );
    }

    return result;
  }, [search, category, sortBy]);

  const handleViewChallenge = (challenge) => {
    setSelectedChallenge(challenge);
  };

  const handleApply = (challengeId) => {
    navigate(`/startup/application/${challengeId}`);
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
      {/* ================================================= */}
      {/* HEADER                                            */}
      {/* ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Sparkles className="h-4 w-4" />
              </div>

              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Opportunities
              </span>
            </div>

            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Explore Challenges
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Discover government challenges that
              match your startup's technology and
              expertise.
            </p>
          </div>

          <div className="rounded-2xl bg-indigo-50 px-5 py-4 dark:bg-indigo-500/10">
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {challenges.length}
            </p>

            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Open challenges
            </p>
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* SEARCH & FILTERS                                  */}
      {/* ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
          {/* SEARCH */}

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search challenges, departments..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:bg-slate-950"
            />
          </div>

          {/* CATEGORY */}

          <FilterSelect
            value={category}
            onChange={setCategory}
            options={categories}
          />

          {/* SORT */}

          <FilterSelect
            value={sortBy}
            onChange={setSortBy}
            options={[
              {
                label: "Deadline",
                value: "deadline",
              },
              {
                label: "Budget",
                value: "budget",
              },
              {
                label: "Applicants",
                value: "applicants",
              },
            ]}
          />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            Showing{" "}
            <span className="font-bold text-slate-600 dark:text-slate-300">
              {filteredChallenges.length}
            </span>{" "}
            challenges
          </p>

          {(search ||
            category !== "All Categories") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategory(
                  "All Categories"
                );
              }}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      {/* ================================================= */}
      {/* CHALLENGES                                        */}
      {/* ================================================= */}

      {filteredChallenges.length > 0 ? (
        <section className="grid gap-5 lg:grid-cols-2">
          {filteredChallenges.map(
            (challenge, index) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                index={index}
                onView={() =>
                  handleViewChallenge(
                    challenge
                  )
                }
                onApply={() =>
                  handleApply(
                    challenge.id
                  )
                }
              />
            )
          )}
        </section>
      ) : (
        <EmptyState
          search={search}
          onClear={() => {
            setSearch("");
            setCategory(
              "All Categories"
            );
          }}
        />
      )}

      {selectedChallenge && (
        <ChallengeDetailModal
          challenge={selectedChallenge}
          onClose={() => setSelectedChallenge(null)}
          onApply={() => {
            const cid = selectedChallenge.id;
            setSelectedChallenge(null);
            handleApply(cid);
          }}
        />
      )}
    </motion.div>
  );
}

/* ===================================================== */
/* CHALLENGE CARD                                       */
/* ===================================================== */

function ChallengeCard({
  challenge,
  index,
  onView,
  onApply,
}) {
  return (
    <motion.article
      initial={{
        opacity: 0,
        y: 12,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.3,
        delay: index * 0.04,
      }}
      className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-indigo-500/30 sm:p-6"
    >
      {/* TOP */}

      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Building2 className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-400">
              {challenge.department}
            </p>

            <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-400">
              {challenge.category}
            </span>
          </div>
        </div>

        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {challenge.status}
        </span>
      </div>

      {/* TITLE */}

      <h2 className="mt-5 text-base font-bold leading-6 text-slate-900 dark:text-white">
        {challenge.title}
      </h2>

      {/* DESCRIPTION */}

      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {challenge.description}
      </p>

      {/* INFO */}

      <div className="mt-5 grid grid-cols-2 gap-3">
        <InfoBox
          icon={IndianRupee}
          label="Estimated Budget"
          value={challenge.budget}
        />

        <InfoBox
          icon={CalendarDays}
          label="Application Deadline"
          value={challenge.deadline}
        />

        <InfoBox
          icon={Users}
          label="Applicants"
          value={`${challenge.applicants} startups`}
        />

        <InfoBox
          icon={Clock3}
          label="Time Remaining"
          value={`${challenge.daysLeft} days left`}
        />
      </div>

      {/* ACTIONS */}

      <div className="mt-6 flex gap-2 border-t border-slate-100 pt-5 dark:border-slate-800">
        <button
          type="button"
          onClick={onView}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-[10px] font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
        >
          View Challenge
          <ArrowRight className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onApply}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-[10px] font-bold text-white transition-all hover:bg-indigo-700"
        >
          Apply Now
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.article>
  );
}

/* ===================================================== */
/* INFO BOX                                              */
/* ===================================================== */

function InfoBox({
  icon: Icon,
  label,
  value,
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-slate-400" />

        <span className="text-[9px] font-medium text-slate-400">
          {label}
        </span>
      </div>

      <p className="mt-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200">
        {value}
      </p>
    </div>
  );
}

/* ===================================================== */
/* FILTER SELECT                                         */
/* ===================================================== */

function FilterSelect({
  value,
  onChange,
  options,
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 pr-9 text-xs font-medium text-slate-600 outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
      >
        {options.map((option) => {
          const item =
            typeof option === "string"
              ? {
                  label: option,
                  value: option,
                }
              : option;

          return (
            <option
              key={item.value}
              value={item.value}
            >
              {item.label}
            </option>
          );
        })}
      </select>

      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

/* ===================================================== */
/* EMPTY STATE                                           */
/* ===================================================== */

function EmptyState({
  search,
  onClear,
}) {
  return (
    <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-950">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-900">
        <Search className="h-6 w-6" />
      </div>

      <h2 className="mt-5 text-base font-bold text-slate-900 dark:text-white">
        No challenges found
      </h2>

      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">
        {search
          ? "We couldn't find any challenge matching your search."
          : "There are no challenges matching the selected filters."}
      </p>

      <button
        type="button"
        onClick={onClear}
        className="mt-5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
      >
        Clear Filters
      </button>
    </section>
  );
}

/* ===================================================== */
/* HELPER                                                */
/* ===================================================== */

function extractBudget(value) {
  return Number(
    String(value).replace(/[^\d.]/g, "")
  );
}

/* ===================================================== */
/* CHALLENGE DETAIL MODAL                                */
/* ===================================================== */

function ChallengeDetailModal({
  challenge,
  onClose,
  onApply,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Building2 className="h-6 w-6" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {challenge.department}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-400">
                  {challenge.category}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {challenge.status}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <h2 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
          {challenge.title}
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {challenge.description}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <InfoBox
            icon={IndianRupee}
            label="Estimated Budget"
            value={challenge.budget}
          />
          <InfoBox
            icon={CalendarDays}
            label="Deadline"
            value={challenge.deadline}
          />
          <InfoBox
            icon={Users}
            label="Applicants"
            value={`${challenge.applicants} startups`}
          />
          <InfoBox
            icon={Clock3}
            label="Time Left"
            value={`${challenge.daysLeft} days`}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Eligibility & Key Criteria
          </h3>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              DPIIT recognized startups or incorporated entities in India
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              Valid GST and tax compliance documentation
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              Working prototype or deployed pilot capability
            </li>
          </ul>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-3 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            Close
          </button>

          <button
            type="button"
            onClick={onApply}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white transition-all hover:bg-indigo-700"
          >
            Apply for this Challenge
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default StartupChallenges;