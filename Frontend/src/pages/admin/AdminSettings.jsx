import { useState } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Shield,
  Bell,
  Sliders,
  Save,
  CheckCircle2,
  Lock,
  Mail,
  Globe,
  Database,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function AdminSettings() {
  const navigate = useNavigate();

  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  const initialSettings = {
    platformName: "SetuGov Procurement OS",
    supportEmail: "support@setugov.gov.in",
    timezone: "IST (UTC+05:30)",
    currency: "INR (₹)",
    mfaRequired: true,
    sessionTimeout: "30",
    auditRetentionDays: "365",
    emailNotifications: true,
    challengeSubmissionAlerts: true,
    evaluationReminders: true,
    autoBackupEnabled: true,
  };

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("setugov_admin_settings");
      return saved ? JSON.parse(saved) : initialSettings;
    } catch {
      return initialSettings;
    }
  });

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem("setugov_admin_settings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* HEADER */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <button
          type="button"
          onClick={() => navigate("/admin/dashboard")}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Admin Dashboard
        </button>

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Settings className="h-6 w-6" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Administration
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Platform Settings
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Manage global platform preferences, security policies and system notifications.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white transition-all hover:bg-indigo-700"
          >
            {saved ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                Changes Saved!
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Preferences
              </>
            )}
          </button>
        </div>
      </section>

      {/* TABS */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 dark:border-slate-800">
        {[
          { id: "general", label: "General", icon: Sliders },
          { id: "security", label: "Security & Access", icon: Shield },
          { id: "notifications", label: "Notifications", icon: Bell },
          { id: "system", label: "System & Backups", icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}
      <form onSubmit={handleSave} className="space-y-6">
        {activeTab === "general" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              General Configuration
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Basic platform identity and locale details.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Platform Name
                </label>
                <input
                  type="text"
                  value={settings.platformName}
                  onChange={(e) => handleChange("platformName", e.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Support Email
                </label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => handleChange("supportEmail", e.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Timezone
                </label>
                <select
                  value={settings.timezone}
                  onChange={(e) => handleChange("timezone", e.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                >
                  <option>IST (UTC+05:30)</option>
                  <option>UTC (UTC+00:00)</option>
                  <option>EST (UTC-05:00)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Default Currency
                </label>
                <select
                  value={settings.currency}
                  onChange={(e) => handleChange("currency", e.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                >
                  <option>INR (₹)</option>
                  <option>USD ($)</option>
                  <option>EUR (€)</option>
                </select>
              </div>
            </div>
          </section>
        )}

        {activeTab === "security" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Security & Authentication
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Access control and authentication security standards.
            </p>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Mandatory Multi-Factor Authentication (MFA)
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Require OTP / Authenticator app verification for government and evaluator roles.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.mfaRequired}
                  onChange={(e) => handleChange("mfaRequired", e.target.checked)}
                  className="h-5 w-5 rounded accent-indigo-600"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Session Inactivity Timeout (Minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => handleChange("sessionTimeout", e.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Audit Log Retention Period (Days)
                  </label>
                  <input
                    type="number"
                    value={settings.auditRetentionDays}
                    onChange={(e) => handleChange("auditRetentionDays", e.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "notifications" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              System Notifications
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Configure event-triggered notification dispatches.
            </p>

            <div className="mt-6 space-y-3">
              {[
                {
                  key: "emailNotifications",
                  title: "Platform Email Dispatches",
                  desc: "Send automated email updates for key status changes.",
                },
                {
                  key: "challengeSubmissionAlerts",
                  title: "Challenge Application Alerts",
                  desc: "Notify administrators whenever a startup submits a new proposal.",
                },
                {
                  key: "evaluationReminders",
                  title: "Evaluator Deadline Reminders",
                  desc: "Send automated reminders to evaluators 48h before scoring deadlines.",
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {item.desc}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings[item.key]}
                    onChange={(e) => handleChange(item.key, e.target.checked)}
                    className="h-5 w-5 rounded accent-indigo-600"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "system" && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Database & Maintenance
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Operational backups and system synchronization state.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Automated Daily Backup
                    </p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                      Status: Active (Last run: 03:00 AM)
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      Search Index & Embeddings
                    </p>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400">
                      Status: Synchronized (100%)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </form>
    </motion.div>
  );
}

export default AdminSettings;
