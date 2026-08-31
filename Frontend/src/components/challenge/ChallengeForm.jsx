
import FormField from "../ui/FormField";

function ChallengeForm({
  formData,
  errors,
  onChange,
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">
          Define the Problem
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-400">
          Describe the operational problem that needs an
          innovative solution.
        </p>
      </div>

      <div className="grid gap-6">
        <FormField
          label="Challenge title"
          name="title"
          value={formData.title}
          onChange={onChange}
          placeholder="Enter a clear, outcome-focused challenge title"
          required
          error={errors.title}
          helperText="Keep the title concise and focused on the problem or outcome."
        />

        <div className="grid gap-6 md:grid-cols-2">
          <FormField
            label="Department"
            name="department"
            value={formData.department}
            onChange={onChange}
            placeholder="Enter department name"
            required
            error={errors.department}
          />

          <FormField
            label="Location"
            name="location"
            value={formData.location}
            onChange={onChange}
            placeholder="City, district, state or facility"
            required
            error={errors.location}
          />
        </div>

        <FormField
          label="Problem description"
          name="problemDescription"
          value={formData.problemDescription}
          onChange={onChange}
          placeholder="Describe the problem, who is affected, and why it matters..."
          type="textarea"
          rows={7}
          required
          error={errors.problemDescription}
          helperText="Provide enough context for startups to understand the real-world problem."
        />

        <FormField
          label="Current process"
          name="currentProcess"
          value={formData.currentProcess}
          onChange={onChange}
          placeholder="Describe how this process is currently handled..."
          type="textarea"
          rows={5}
          required
          error={errors.currentProcess}
        />

        <FormField
          label="Current baseline"
          name="currentBaseline"
          value={formData.currentBaseline}
          onChange={onChange}
          placeholder="Example: Average waiting time is 90 minutes"
          type="textarea"
          rows={4}
          required
          error={errors.currentBaseline}
          helperText="Include measurable baseline information wherever available."
        />
      </div>
    </div>
  );
}

export default ChallengeForm;

