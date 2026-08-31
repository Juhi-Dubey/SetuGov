import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Edit3,
  Globe,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const initialProfile = {
  companyName: "GreenTech Innovations Pvt. Ltd.",
  founderName: "Demo Founder",
  email: "contact@greentech.in",
  phone: "+91 98765 43210",
  website: "https://www.greentech.in",
  category: "CleanTech",
  stage: "Growth Stage",
  registrationNumber: "U72900JH2024PTC012345",
  gstNumber: "20ABCDE1234F1Z5",
  city: "Jamshedpur",
  state: "Jharkhand",
  foundedYear: "2024",
  employees: "25–50",
  about:
    "GreenTech Innovations develops technology solutions for sustainable urban infrastructure and smart waste management.",
};

function StartupProfile() {
  const navigate = useNavigate();

  const [profile, setProfile] =
    useState(initialProfile);

  const [editing, setEditing] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }));

    setSaved(false);
  };

  const handleSave = () => {
    setEditing(false);
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 3000);
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
        <button
          type="button"
          onClick={() => navigate("/startup")}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <Building2 className="h-7 w-7" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Startup Account
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Startup Profile
              </h1>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Manage your organization's information
                and registration details.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saved && (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Changes saved
              </span>
            )}

            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700"
              >
                <Edit3 className="h-4 w-4" />
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setProfile(initialProfile);
                    setEditing(false);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* PROFILE COMPLETION                                */}
      {/* ================================================= */}

      <section className="rounded-3xl border border-indigo-100 bg-indigo-50/60 p-5 dark:border-indigo-500/20 dark:bg-indigo-500/5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Profile Completeness
            </h2>

            <p className="mt-1 text-[10px] leading-5 text-slate-500 dark:text-slate-400">
              Keep your profile complete so government
              departments can evaluate your startup
              information easily.
            </p>
          </div>

          <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            92%
          </span>
        </div>

        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white dark:bg-slate-900">
          <div
            className="h-full rounded-full bg-indigo-600"
            style={{
              width: "92%",
            }}
          />
        </div>
      </section>

      {/* ================================================= */}
      {/* COMPANY INFORMATION                               */}
      {/* ================================================= */}

      <ProfileSection
        icon={Building2}
        title="Company Information"
        description="Basic information about your startup."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <InputField
            label="Company Name"
            name="companyName"
            value={profile.companyName}
            onChange={handleChange}
            editing={editing}
          />

          <InputField
            label="Industry / Category"
            name="category"
            value={profile.category}
            onChange={handleChange}
            editing={editing}
          />

          <InputField
            label="Startup Stage"
            name="stage"
            value={profile.stage}
            onChange={handleChange}
            editing={editing}
          />

          <InputField
            label="Founded Year"
            name="foundedYear"
            value={profile.foundedYear}
            onChange={handleChange}
            editing={editing}
          />

          <InputField
            label="Number of Employees"
            name="employees"
            value={profile.employees}
            onChange={handleChange}
            editing={editing}
          />

          <InputField
            label="Website"
            name="website"
            value={profile.website}
            onChange={handleChange}
            editing={editing}
          />
        </div>

        <div className="mt-5">
          <TextAreaField
            label="About Startup"
            name="about"
            value={profile.about}
            onChange={handleChange}
            editing={editing}
          />
        </div>
      </ProfileSection>

      {/* ================================================= */}
      {/* FOUNDER INFORMATION                               */}
      {/* ================================================= */}

      <ProfileSection
        icon={User}
        title="Founder / Representative"
        description="Primary contact person for the startup."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <InputField
            label="Founder / Representative Name"
            name="founderName"
            value={profile.founderName}
            onChange={handleChange}
            editing={editing}
          />

          <InputField
            label="Email Address"
            name="email"
            value={profile.email}
            onChange={handleChange}
            editing={editing}
            type="email"
          />

          <InputField
            label="Phone Number"
            name="phone"
            value={profile.phone}
            onChange={handleChange}
            editing={editing}
          />
        </div>
      </ProfileSection>

      {/* ================================================= */}
      {/* REGISTRATION                                      */}
      {/* ================================================= */}

      <ProfileSection
        icon={ShieldCheck}
        title="Registration & Compliance"
        description="Government and statutory registration details."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <InputField
            label="Company Registration Number"
            name="registrationNumber"
            value={profile.registrationNumber}
            onChange={handleChange}
            editing={editing}
          />

          <InputField
            label="GST Number"
            name="gstNumber"
            value={profile.gstNumber}
            onChange={handleChange}
            editing={editing}
          />
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-500/10">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />

          <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
            Registration information verified
          </p>
        </div>
      </ProfileSection>

      {/* ================================================= */}
      {/* LOCATION & CONTACT                                */}
      {/* ================================================= */}

      <ProfileSection
        icon={MapPin}
        title="Location & Contact"
        description="Business location and communication details."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <InputField
            label="City"
            name="city"
            value={profile.city}
            onChange={handleChange}
            editing={editing}
          />

          <InputField
            label="State"
            name="state"
            value={profile.state}
            onChange={handleChange}
            editing={editing}
          />

          <InputField
            label="Business Email"
            name="email"
            value={profile.email}
            onChange={handleChange}
            editing={editing}
            icon={Mail}
          />

          <InputField
            label="Contact Number"
            name="phone"
            value={profile.phone}
            onChange={handleChange}
            editing={editing}
            icon={Phone}
          />
        </div>
      </ProfileSection>

      {/* ================================================= */}
      {/* PUBLIC PROFILE PREVIEW                            */}
      {/* ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <Globe className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Public Startup Profile
            </h2>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              This information may be visible to
              government evaluators during challenge
              evaluation.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-lg font-bold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
              {profile.companyName
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {profile.companyName}
                </h3>

                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </span>
              </div>

              <p className="mt-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                {profile.category}
              </p>

              <p className="mt-3 max-w-2xl text-xs leading-5 text-slate-500 dark:text-slate-400">
                {profile.about}
              </p>

              <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {profile.city}, {profile.state}
                </span>

                <span className="inline-flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {profile.website}
                </span>

                <span className="inline-flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {profile.stage}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* BOTTOM SAVE                                      */}
      {/* ================================================= */}

      {editing && (
        <div className="flex justify-end pb-4">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-700"
          >
            <Save className="h-4 w-4" />
            Save Profile
          </button>
        </div>
      )}
    </motion.div>
  );
}

/* ===================================================== */
/* PROFILE SECTION                                       */
/* ===================================================== */

function ProfileSection({
  icon: Icon,
  title,
  description,
  children,
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {title}
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-6">
        {children}
      </div>
    </section>
  );
}

/* ===================================================== */
/* INPUT FIELD                                           */
/* ===================================================== */

function InputField({
  label,
  name,
  value,
  onChange,
  editing,
  type = "text",
  icon: Icon,
}) {
  return (
    <div>
      <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </label>

      <div className="relative mt-2">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        )}

        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          disabled={!editing}
          className={`h-11 w-full rounded-xl border px-3 text-xs outline-none transition-all ${
            Icon ? "pl-10" : ""
          } ${
            editing
              ? "border-slate-200 bg-white text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              : "border-transparent bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-200"
          }`}
        />
      </div>
    </div>
  );
}

/* ===================================================== */
/* TEXT AREA                                             */
/* ===================================================== */

function TextAreaField({
  label,
  name,
  value,
  onChange,
  editing,
}) {
  return (
    <div>
      <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </label>

      <textarea
        name={name}
        value={value}
        onChange={onChange}
        disabled={!editing}
        rows={4}
        className={`mt-2 w-full resize-none rounded-xl border px-3 py-3 text-xs leading-5 outline-none transition-all ${
          editing
            ? "border-slate-200 bg-white text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            : "border-transparent bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-200"
        }`}
      />
    </div>
  );
}

export default StartupProfile;