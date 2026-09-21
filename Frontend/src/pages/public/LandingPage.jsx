import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2,
  Rocket,
  ClipboardCheck,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Sun,
  Moon,
  CheckCircle2,
  Award,
  ChevronRight,
  Layers,
  FileCode2,
  Cpu,
  BarChart3,
  Scale,
  DollarSign,
  Users,
  ShieldAlert,
  ArrowUpRight,
  Flame,
  Globe2,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const lifecycleSteps = [
  {
    step: "01",
    title: "Government",
    subtitle: "Department Intent",
    description: "State departments identify operational bottlenecks, civic pain points, and modernization goals.",
    icon: Building2,
    color: "from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50",
    textColor: "text-blue-600 dark:text-blue-400",
  },
  {
    step: "02",
    title: "Challenge",
    subtitle: "AI-Assisted Scoping",
    description: "Challenges are structured with clear KPIs, evaluation rubrics, eligibility criteria, and pilot budgets.",
    icon: Sparkles,
    color: "from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50",
    textColor: "text-amber-600 dark:text-amber-400",
  },
  {
    step: "03",
    title: "Startup",
    subtitle: "Proposal Submission",
    description: "Verified deep-tech startups submit technical architectures, timelines, and impact projections.",
    icon: Rocket,
    color: "from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50",
    textColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    step: "04",
    title: "Evaluation",
    subtitle: "Objective Multi-Review",
    description: "Independent domain experts score submissions with AI advisory screening and conflict-of-interest safeguards.",
    icon: ClipboardCheck,
    color: "from-purple-500/20 to-pink-500/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/50",
    textColor: "text-purple-600 dark:text-purple-400",
  },
  {
    step: "05",
    title: "Pilot",
    subtitle: "Sandbox Verification",
    description: "Winning startups deploy working prototypes in live sandbox environments with tranche-based payouts.",
    icon: Cpu,
    color: "from-cyan-500/20 to-blue-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-900/50",
    textColor: "text-cyan-600 dark:text-cyan-400",
  },
  {
    step: "06",
    title: "Outcome",
    subtitle: "Scale & Deployment",
    description: "Successful pilots transition into department-wide adoption, institutional procurement, and state scaling.",
    icon: Award,
    color: "from-rose-500/20 to-red-500/20 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50",
    textColor: "text-rose-600 dark:text-rose-400",
  },
];

const stakeholderBenefits = {
  government: {
    title: "Government Departments",
    badge: "For Public Sector",
    icon: Building2,
    description:
      "Accelerate innovation procurement without bureaucratic inertia. SetuGov standardizes challenge formulation, milestone verification, and compliance.",
    highlights: [
      "AI Copilot to convert abstract problem statements into structured procurement RFPs",
      "Immutable milestone tracking with audited evidence before payment approval",
      "Multi-tier departmental isolation with role-based access control",
      "Full compliance with state procurement vigilance and audit standards",
    ],
    ctaText: "Request Official Access",
    ctaLink: "/government/request-access",
    color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50",
    btnColor: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 dark:bg-blue-600 dark:hover:bg-blue-500",
  },
  startup: {
    title: "Innovators & Startups",
    badge: "For Deep-Tech Startups",
    icon: Rocket,
    description:
      "Directly address high-impact state challenges. Gain non-dilutive pilot funding, institutional validation, and fast-track commercial deployment.",
    highlights: [
      "Transparent 5-factor scoring rubric with zero backroom ambiguity",
      "Milestone-linked payouts released directly upon verifiable deliverable validation",
      "Real-world state sandbox deployment with actual civic data and users",
      "State-wide contract scaling pathway following successful pilot completion",
    ],
    ctaText: "Create Startup Account",
    ctaLink: "/signup",
    color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50",
    btnColor: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 dark:bg-emerald-600 dark:hover:bg-emerald-500",
  },
  evaluator: {
    title: "Subject Matter Experts",
    badge: "For Domain Evaluators",
    icon: ClipboardCheck,
    description:
      "Join premier evaluation panels assessing cutting-edge tech in AI, Healthcare, Urban Infra, Agriculture, and Cybersecurity for state adoption.",
    highlights: [
      "AI-assisted proposal screening that summarizes technical viability and risk flags",
      "Formal conflict-of-interest declaration and recusal protections",
      "Direct contribution to national policy, governance modernization, and tech adoption",
      "Open to both university/corporate employees and independent domain consultants",
    ],
    ctaText: "Apply as Evaluator",
    ctaLink: "/evaluator/apply",
    color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/50",
    btnColor: "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-600/20 dark:bg-purple-600 dark:hover:bg-purple-500",
  },
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("government");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-white">
      {/* =====================================================
          TOP NAVIGATION BAR
      ===================================================== */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/80">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo & Platform Title */}
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-900">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  SetuGov
                </span>
                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                  Gov-Tech OS
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Government Innovation Procurement Platform
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <a href="#how-it-works" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
              How It Works
            </a>
            <a href="#stakeholders" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
              Stakeholders
            </a>
            <a href="#actions" className="transition hover:text-indigo-600 dark:hover:text-indigo-400">
              Onboarding
            </a>
          </nav>

          {/* Right Action CTAs & Theme Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <Link
              to="/login"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Sign In
            </Link>

            <Link
              to="/signup"
              className="hidden sm:inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500"
            >
              <Rocket className="h-3.5 w-3.5" />
              Startup Signup
            </Link>
          </div>
        </div>
      </header>

      {/* =====================================================
          HERO SECTION
      ===================================================== */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        {/* Background glow decorations */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 h-96 w-[48rem] rounded-full bg-indigo-500/10 blur-3xl pointer-events-none dark:bg-indigo-500/15" />
        <div className="absolute top-40 right-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none dark:bg-blue-500/15" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            {/* National Initiative Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-4 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-300"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Public Sector Innovation Procurement Platform</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-slate-900 dark:text-white leading-[1.15]"
            >
              Transforming State Challenges into{" "}
              <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-600 bg-clip-text text-transparent dark:from-indigo-400 dark:via-blue-400 dark:to-emerald-400">
                Verifiable Innovation
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="mt-6 text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-300"
            >
              SetuGov bridges Government Departments, Deep-Tech Startups, and Independent Domain Experts on an immutable, audited procurement OS—from AI challenge definition to live sandbox pilots and state scaling.
            </motion.p>

            {/* Quick Action Matrix CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4"
            >
              {/* Primary Call to Action */}
              <Link
                to="/signup"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500"
              >
                <Rocket className="h-4 w-4" />
                Register as Startup
                <ArrowRight className="h-4 w-4" />
              </Link>

              {/* Secondary Navigation Actions */}
              <Link
                to="/government/request-access"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/90 px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
              >
                <Building2 className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                Government Officer Access
              </Link>

              <Link
                to="/evaluator/apply"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/90 px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
              >
                <ClipboardCheck className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                Apply as Evaluator
              </Link>
            </motion.div>

            {/* Quick Demo Workspace link */}
            <div className="mt-7 flex items-center justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300">
                <span>Already registered?</span>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-700 underline-offset-4 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  Log in to Workspace <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>

          {/* Live Metrics Grid */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6"
          >
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">14+</p>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">State Departments</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">₹48+ Cr</p>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Innovation Capital</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">120+</p>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Verified Startups</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400">100%</p>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">Audited Milestone Payouts</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* =====================================================
          INNOVATION LIFECYCLE FLOWCHART (How It Works)
      ===================================================== */}
      <section id="how-it-works" className="border-t border-slate-200 bg-slate-100/50 py-20 dark:border-slate-800 dark:bg-slate-900/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              End-to-End Lifecycle Architecture
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              How SetuGov Works
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              A transparent, audited 6-stage lifecycle that converts raw public sector needs into proven, operational software solutions.
            </p>
          </div>

          {/* 6 Lifecycle Steps Grid */}
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {lifecycleSteps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.step}
                  className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black tracking-widest text-slate-400">
                      PHASE {step.step}
                    </span>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border bg-gradient-to-br ${step.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                    {step.title}
                  </h3>
                  <p className={`text-sm font-semibold ${step.textColor}`}>
                    {step.subtitle}
                  </p>

                  <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================
          STAKEHOLDER VALUE PROPOSITIONS
      ===================================================== */}
      <section id="stakeholders" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
              Tailored Capabilities
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Engineered for Every Stakeholder
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Explore dedicated features and workflows designed specifically for public officers, startups, and expert evaluators.
            </p>
          </div>

          {/* Stakeholder Tabs */}
          <div className="mt-10 flex justify-center">
            <div
              role="tablist"
              aria-label="Stakeholder categories"
              className="inline-flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              {Object.keys(stakeholderBenefits).map((key) => {
                const item = stakeholderBenefits[key];
                const Icon = item.icon;
                const isSelected = activeTab === key;
                return (
                  <button
                    key={key}
                    id={`tab-${key}`}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    aria-controls={`panel-${key}`}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => setActiveTab(key)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      isSelected
                        ? "bg-blue-600 text-white shadow-sm dark:bg-blue-600 dark:text-white"
                        : "text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/80"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isSelected ? "" : "text-slate-500 dark:text-slate-400"}`} />
                    {item.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Stakeholder Detail Panel */}
          {(() => {
            const activeData = stakeholderBenefits[activeTab];
            const Icon = activeData.icon;
            return (
              <div
                id={`panel-${activeTab}`}
                role="tabpanel"
                aria-labelledby={`tab-${activeTab}`}
                className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
                  <div className="lg:col-span-7">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                      {activeData.badge}
                    </span>
                    <h3 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">
                      {activeData.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {activeData.description}
                    </p>

                    <div className="mt-6 space-y-3">
                      {activeData.highlights.map((h, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                          <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                            {h}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8">
                      <Link
                        to={activeData.ctaLink}
                        className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-bold shadow-sm transition hover:-translate-y-0.5 ${activeData.btnColor}`}
                      >
                        {activeData.ctaText}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>

                  <div className="lg:col-span-5">
                    <div className={`w-full rounded-3xl border p-6 sm:p-7 shadow-sm ${activeData.color}`}>
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-md dark:bg-slate-900 dark:text-white">
                          <Icon className="h-7 w-7" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider opacity-75">
                            SetuGov Dedicated Module
                          </p>
                          <p className="text-lg font-bold">
                            {activeData.title}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 space-y-3">
                        <div className="rounded-2xl bg-white/85 p-4 shadow-sm backdrop-blur dark:bg-slate-900/85">
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Key Operational Principle
                          </p>
                          <p className="mt-1.5 text-sm leading-relaxed text-slate-800 dark:text-slate-200 font-medium">
                            {activeTab === "government" && "Zero unverified accounts. Formal department mapping & official domain email verification."}
                            {activeTab === "startup" && "Open public self-signup with DPIIT documentation and instant challenge discovery."}
                            {activeTab === "evaluator" && "Strict conflict-of-interest declarations with automated recusal guarantees."}
                          </p>
                        </div>

                        <div className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-2.5 text-xs font-semibold backdrop-blur dark:bg-slate-900/60">
                          <span className="text-slate-600 dark:text-slate-400">Environment Access</span>
                          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            Production Verified
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* =====================================================
          ACTION CARDS (ONBOARDING ENTRY POINTS)
      ===================================================== */}
      <section id="actions" className="border-t border-slate-200 bg-slate-100/50 py-20 dark:border-slate-800 dark:bg-slate-900/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Get Started
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Choose Your Gateway
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Select your role below to begin your onboarding journey or access your secure dashboard.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Login */}
            <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                  Existing Members
                </h3>
                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Access your government, startup, evaluator, or admin workspace using your credentials.
                </p>
              </div>
              <Link
                to="/login"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 py-2.5 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-slate-100 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Sign In <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>

            {/* 2. Startup Signup */}
            <div className="flex flex-col justify-between rounded-3xl border border-emerald-200 bg-emerald-50/30 p-6 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/10">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                  <Rocket className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                  Startup Registration
                </h3>
                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Public registration for tech startups to browse live state challenges and submit proposals.
                </p>
              </div>
              <Link
                to="/signup"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
              >
                Register Startup <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* 3. Government Request */}
            <div className="flex flex-col justify-between rounded-3xl border border-blue-200 bg-blue-50/30 p-6 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/10">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                  <Building2 className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                  Government Officers
                </h3>
                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Official access request for state departments. Verified and provisioned by state admins.
                </p>
              </div>
              <Link
                to="/government/request-access"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
              >
                Request Access <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* 4. Evaluator Application */}
            <div className="flex flex-col justify-between rounded-3xl border border-purple-200 bg-purple-50/30 p-6 shadow-sm dark:border-purple-900/40 dark:bg-purple-950/10">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                  Domain Evaluators
                </h3>
                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Apply as an independent or employed expert to evaluate technical feasibility & impact.
                </p>
              </div>
              <Link
                to="/evaluator/apply"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-purple-700"
              >
                Apply to Join <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}
      <footer className="border-t border-slate-200 bg-white py-12 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">SetuGov Platform</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">State Innovation Procurement Operating System</p>
              </div>
            </div>

            <nav aria-label="Footer Navigation" className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500 dark:text-slate-400">
              <Link
                to="/login"
                className="rounded-lg px-3 py-1.5 font-medium transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white"
              >
                Workspace Sign In
              </Link>
              <Link
                to="/signup"
                className="rounded-lg px-3 py-1.5 font-medium transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white"
              >
                Startup Registration
              </Link>
              <Link
                to="/government/request-access"
                className="rounded-lg px-3 py-1.5 font-medium transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white"
              >
                Official Access
              </Link>
              <Link
                to="/evaluator/apply"
                className="rounded-lg px-3 py-1.5 font-medium transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white"
              >
                Evaluator Panel
              </Link>
            </nav>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-400 dark:border-slate-800/80">
            &copy; {new Date().getFullYear()} SetuGov. Open Government Innovation Architecture. All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
