import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  File,
  FileCheck2,
  FileText,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const initialDocuments = [
  {
    id: 1,
    name: "Certificate of Incorporation",
    category: "Company Registration",
    fileName: "certificate-of-incorporation.pdf",
    size: "1.8 MB",
    uploaded: "12 Aug 2026",
    status: "Verified",
  },
  {
    id: 2,
    name: "GST Registration Certificate",
    category: "Tax & Compliance",
    fileName: "gst-certificate.pdf",
    size: "920 KB",
    uploaded: "12 Aug 2026",
    status: "Verified",
  },
  {
    id: 3,
    name: "Company Registration Document",
    category: "Company Registration",
    fileName: "company-registration.pdf",
    size: "1.2 MB",
    uploaded: "13 Aug 2026",
    status: "Verified",
  },
  {
    id: 4,
    name: "Pilot Agreement",
    category: "Pilot Documents",
    fileName: "pilot-agreement.pdf",
    size: "2.4 MB",
    uploaded: "18 Aug 2026",
    status: "Verified",
  },
  {
    id: 5,
    name: "Deployment Report",
    category: "Pilot Evidence",
    fileName: "deployment-report.pdf",
    size: "3.1 MB",
    uploaded: "28 Aug 2026",
    status: "Under Review",
  },
];

const documentTypes = [
  "Company Registration",
  "Tax & Compliance",
  "Pilot Documents",
  "Pilot Evidence",
  "Other",
];

function StartupDocuments() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [documents, setDocuments] =
    useState(initialDocuments);

  const [showUpload, setShowUpload] =
    useState(false);

  const [selectedType, setSelectedType] =
    useState(documentTypes[0]);

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [uploading, setUploading] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [categoryFilter, setCategoryFilter] =
    useState("All");

  const [selectedDocument, setSelectedDocument] =
    useState(null);

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    setUploading(true);

    setTimeout(() => {
      const newDocument = {
        id: Date.now(),
        name: selectedFile.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[-_]/g, " "),
        category: selectedType,
        fileName: selectedFile.name,
        size: formatFileSize(
          selectedFile.size
        ),
        uploaded: formatCurrentDate(),
        status: "Under Review",
        file: selectedFile,
        fileUrl: URL.createObjectURL(selectedFile),
      };

      setDocuments((previous) => [
        newDocument,
        ...previous,
      ]);

      setSelectedFile(null);
      setSelectedType(documentTypes[0]);
      setUploading(false);
      setShowUpload(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }, 700);
  };

  const filteredDocuments =
    documents.filter((document) => {
      const matchesSearch =
        document.name
          .toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||
        document.fileName
          .toLowerCase()
          .includes(
            search.toLowerCase()
          );

      const matchesCategory =
        categoryFilter === "All" ||
        document.category ===
          categoryFilter;

      return (
        matchesSearch &&
        matchesCategory
      );
    });

  const verifiedCount =
    documents.filter(
      (document) =>
        document.status === "Verified"
    ).length;

  const reviewCount =
    documents.filter(
      (document) =>
        document.status === "Under Review"
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
    >
      {/* ================================================= */}
      {/* HEADER                                            */}
      {/* ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-8">
        <button
          type="button"
          onClick={() =>
            navigate("/startup")
          }
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <FileText className="h-6 w-6" />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Startup Workspace
              </p>

              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Documents
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                Manage company, compliance, pilot and
                supporting documents required during
                the government innovation process.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowUpload(true)
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Upload Document
          </button>
        </div>
      </section>

      {/* ================================================= */}
      {/* SUMMARY                                           */}
      {/* ================================================= */}

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={FileText}
          title="Total Documents"
          value={documents.length}
          description="Uploaded documents"
        />

        <SummaryCard
          icon={FileCheck2}
          title="Verified"
          value={verifiedCount}
          description="Documents verified"
          type="success"
        />

        <SummaryCard
          icon={Upload}
          title="Under Review"
          value={reviewCount}
          description="Awaiting verification"
          type="warning"
        />
      </section>

      {/* ================================================= */}
      {/* UPLOAD AREA                                       */}
      {/* ================================================= */}

      {showUpload && (
        <UploadPanel
          fileInputRef={fileInputRef}
          selectedFile={selectedFile}
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          setSelectedFile={setSelectedFile}
          handleFileSelect={handleFileSelect}
          handleUpload={handleUpload}
          uploading={uploading}
          onClose={() =>
            setShowUpload(false)
          }
        />
      )}

      {/* ================================================= */}
      {/* DOCUMENT LIST                                     */}
      {/* ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                My Documents
              </h2>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                All documents uploaded by your startup.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search documents..."
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />

              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(
                    event.target.value
                  )
                }
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              >
                <option value="All">
                  All Categories
                </option>

                {documentTypes.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </div>

        {filteredDocuments.length === 0 ? (
          <EmptyState
            onUpload={() =>
              setShowUpload(true)
            }
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredDocuments.map(
              (document, index) => (
                <DocumentRow
                  key={document.id}
                  document={document}
                  index={index}
                  onView={() =>
                    setSelectedDocument(
                      document
                    )
                  }
                />
              )
            )}
          </div>
        )}
      </section>

      {/* ================================================= */}
      {/* DOCUMENT REQUIREMENTS                             */}
      {/* ================================================= */}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <FileCheck2 className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Document Guidelines
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Make sure documents are clear, valid and
              uploaded in an accepted format.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Guideline
            title="Accepted Formats"
            text="PDF, DOC, DOCX, JPG and PNG."
          />

          <Guideline
            title="Clear Documents"
            text="Upload readable and complete documents."
          />

          <Guideline
            title="Valid Information"
            text="Use current registration and compliance records."
          />
        </div>
      </section>

      {/* ================================================= */}
      {/* DOCUMENT MODAL                                   */}
      {/* ================================================= */}

      {selectedDocument && (
        <DocumentModal
          document={selectedDocument}
          onClose={() =>
            setSelectedDocument(null)
          }
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
  description,
  type,
}) {
  let iconClasses =
    "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400";

  if (type === "success") {
    iconClasses =
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400";
  }

  if (type === "warning") {
    iconClasses =
      "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400";
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClasses}`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <p className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>

      <p className="mt-1 text-xs font-bold text-slate-700 dark:text-slate-300">
        {title}
      </p>

      <p className="mt-1 text-[10px] text-slate-400">
        {description}
      </p>
    </div>
  );
}

/* ===================================================== */
/* UPLOAD PANEL                                          */
/* ===================================================== */

function UploadPanel({
  fileInputRef,
  selectedFile,
  selectedType,
  setSelectedType,
  setSelectedFile,
  handleFileSelect,
  handleUpload,
  uploading,
  onClose,
}) {
  return (
    <motion.section
      initial={{
        opacity: 0,
        y: -8,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-5 dark:border-indigo-500/20 dark:bg-indigo-500/5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Upload New Document
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Select a document category and upload
            your file.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-2 text-slate-400 hover:bg-white dark:hover:bg-slate-900"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Document Category
          </label>

          <select
            value={selectedType}
            onChange={(event) =>
              setSelectedType(
                event.target.value
              )
            }
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            {documentTypes.map(
              (type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Select File
          </label>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="mt-2 block h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white text-xs text-slate-500 file:mr-3 file:h-full file:border-0 file:bg-slate-100 file:px-3 file:text-[10px] file:font-bold dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:file:bg-slate-900"
          />
        </div>
      </div>

      {selectedFile && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <File className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">
              {selectedFile.name}
            </p>

            <p className="mt-0.5 text-[9px] text-slate-400">
              {formatFileSize(
                selectedFile.size
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);

              if (fileInputRef.current) {
                fileInputRef.current.value =
                  "";
              }
            }}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-white dark:hover:bg-slate-900"
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={!selectedFile || uploading}
          onClick={handleUpload}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />

          {uploading
            ? "Uploading..."
            : "Upload Document"}
        </button>
      </div>
    </motion.section>
  );
}

/* ===================================================== */
/* DOCUMENT ROW                                         */
/* ===================================================== */

function DocumentRow({
  document,
  index,
  onView,
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        x: 10,
      }}
      animate={{
        opacity: 1,
        x: 0,
      }}
      transition={{
        delay: index * 0.04,
      }}
      className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
        <FileText className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-bold capitalize text-slate-800 dark:text-slate-200">
            {document.name}
          </h3>

          <DocumentStatus
            status={document.status}
          />
        </div>

        <p className="mt-1 text-[10px] text-slate-400">
          {document.category}
        </p>

        <div className="mt-2 flex flex-wrap gap-3 text-[9px] text-slate-400">
          <span>{document.fileName}</span>
          <span>{document.size}</span>
          <span>
            Uploaded {document.uploaded}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onView}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-[10px] font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-indigo-600 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-indigo-400"
      >
        View
      </button>
    </motion.div>
  );
}

/* ===================================================== */
/* STATUS                                               */
/* ===================================================== */

function DocumentStatus({
  status,
}) {
  const verified =
    status === "Verified";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold ${
        verified
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
          : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
      }`}
    >
      {verified ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <Upload className="h-3 w-3" />
      )}

      {status}
    </span>
  );
}

/* ===================================================== */
/* EMPTY STATE                                          */
/* ===================================================== */

function EmptyState({
  onUpload,
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-900">
        <FileText className="h-6 w-6" />
      </div>

      <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-200">
        No documents found
      </h3>

      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
        Try changing your search or upload a new
        document.
      </p>

      <button
        type="button"
        onClick={onUpload}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700"
      >
        <Plus className="h-4 w-4" />
        Upload Document
      </button>
    </div>
  );
}

/* ===================================================== */
/* GUIDELINE                                            */
/* ===================================================== */

function Guideline({
  title,
  text,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
        {title}
      </h3>

      <p className="mt-1.5 text-[10px] leading-5 text-slate-400">
        {text}
      </p>
    </div>
  );
}

/* ===================================================== */
/* DOCUMENT MODAL                                       */
/* ===================================================== */

function DocumentModal({
  document,
  onClose,
}) {
  const handleDownload = () => {
    if (document.fileUrl) {
      const link = window.document.createElement("a");
      link.href = document.fileUrl;
      link.download = document.fileName || "document";
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      return;
    }

    if (document.file) {
      const url = URL.createObjectURL(document.file);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = document.fileName || "document";
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    // Default mock documents fallback
    const content = `Document: ${document.name}\nCategory: ${document.category}\nFile Name: ${document.fileName}\nUploaded: ${document.uploaded}\nStatus: ${document.status}\n\nSetuGov Platform Demo Document Content.`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = document.fileName || `${document.name}.txt`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.96,
        }}
        animate={{
          opacity: 1,
          scale: 1,
        }}
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <FileText className="h-5 w-5" />
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-indigo-500">
                Document
              </p>

              <h2 className="mt-1 text-sm font-bold capitalize text-slate-900 dark:text-white">
                {document.name}
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
          <ModalDetail
            label="Category"
            value={document.category}
          />

          <ModalDetail
            label="File Name"
            value={document.fileName}
          />

          <ModalDetail
            label="File Size"
            value={document.size}
          />

          <ModalDetail
            label="Uploaded"
            value={document.uploaded}
          />

          <ModalDetail
            label="Status"
            value={document.status}
          />
        </div>

        <button
          type="button"
          onClick={handleDownload}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white hover:bg-indigo-700"
        >
          <Download className="h-4 w-4" />
          Download Document
        </button>
      </motion.div>
    </div>
  );
}

/* ===================================================== */
/* MODAL DETAIL                                         */
/* ===================================================== */

function ModalDetail({
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

/* ===================================================== */
/* HELPERS                                              */
/* ===================================================== */

function formatFileSize(bytes) {
  if (!bytes) return "0 KB";

  const units = [
    "Bytes",
    "KB",
    "MB",
    "GB",
  ];

  const index = Math.floor(
    Math.log(bytes) /
      Math.log(1024)
  );

  return `${(
    bytes /
    Math.pow(1024, index)
  ).toFixed(index === 0 ? 0 : 1)} ${
    units[index]
  }`;
}

function formatCurrentDate() {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(new Date());
}

export default StartupDocuments;