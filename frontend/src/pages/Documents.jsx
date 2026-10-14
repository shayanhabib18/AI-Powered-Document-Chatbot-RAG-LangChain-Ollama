import { useEffect, useRef, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const STORAGE_KEY = "documind_uploaded_documents";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [".pdf", ".txt", ".docx"];

function getStoredDocuments() {
  try {
    const storedDocuments = localStorage.getItem(STORAGE_KEY);

    return storedDocuments ? JSON.parse(storedDocuments) : [];
  } catch {
    return [];
  }
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "Unknown size";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileExtension(filename = "") {
  return filename.split(".").pop()?.toUpperCase() || "FILE";
}

function getFileIcon(filename = "") {
  const extension = filename.split(".").pop()?.toLowerCase();

  if (extension === "pdf") return "📕";
  if (extension === "docx") return "📘";
  if (extension === "txt") return "📄";

  return "📁";
}

function formatDate(dateString) {
  if (!dateString) {
    return "Recently uploaded";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Recently uploaded";
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Documents() {
  const fileInputRef = useRef(null);

  const [documents, setDocuments] = useState(getStoredDocuments);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // --------------------------------------------------
  // SAVE DOCUMENT LIST IN BROWSER STORAGE
  // --------------------------------------------------

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(documents)
      );
    } catch (error) {
      console.error(
        "Could not save document history:",
        error
      );
    }
  }, [documents]);

  // --------------------------------------------------
  // VALIDATE SELECTED FILES
  // --------------------------------------------------

  function validateFiles(files) {
    const validFiles = [];
    const errors = [];

    for (const file of files) {
      const extension = `.${file.name
        .split(".")
        .pop()
        .toLowerCase()}`;

      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        errors.push(
          `${file.name}: Unsupported file type.`
        );

        continue;
      }

      if (file.size === 0) {
        errors.push(
          `${file.name}: The file is empty.`
        );

        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        errors.push(
          `${file.name}: File size exceeds 10 MB.`
        );

        continue;
      }

      validFiles.push(file);
    }

    return {
      validFiles,
      errors,
    };
  }

  // --------------------------------------------------
  // HANDLE FILE SELECTION
  // --------------------------------------------------

  function handleFileSelection(event) {
    const files = Array.from(event.target.files || []);

    addSelectedFiles(files);

    // Allows the same file to be selected again.
    event.target.value = "";
  }

  async function handleDeleteDocument(document) {
    const documentId =
      document.id ||
      document.filename ||
      document.document_id;

    if (!documentId) {
      setErrorMessage("Unable to identify this document.");
      return;
    }

    const filename =
      document.original_filename ||
      document.filename ||
      "this document";

    if (
      !window.confirm(
        `Delete "${filename}"? This also removes its indexed content.`
      )
    ) {
      return;
    }

    setErrorMessage("");
    setStatusMessage("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/documents/${encodeURIComponent(documentId)}`,
        { method: "DELETE" }
      );
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 404) {
          setDocuments((previous) =>
            previous.filter(
              (item) =>
                item.id !== documentId &&
                item.filename !== documentId &&
                item.document_id !== documentId
            )
          );
          throw new Error(
            "This document no longer exists on the backend. The stale entry was removed."
          );
        }

        throw new Error(
          result.detail ||
            `Unable to delete the document (status ${response.status}).`
        );
      }

      setDocuments((previous) =>
        previous.filter(
          (item) =>
            item.id !== documentId &&
            item.filename !== documentId &&
            item.document_id !== documentId
        )
      );
      setStatusMessage(`"${filename}" was deleted successfully.`);
    } catch (error) {
      console.error("Document deletion error:", error);
      setErrorMessage(
        error.message ||
          "Could not delete the document. Make sure the backend is running."
      );
    }
  }

  function addSelectedFiles(files) {
    if (files.length === 0) {
      return;
    }

    setStatusMessage("");
    setErrorMessage("");

    const { validFiles, errors } = validateFiles(files);

    if (validFiles.length > 0) {
      setSelectedFiles((previousFiles) => {
        const combinedFiles = [...previousFiles];

        for (const file of validFiles) {
          const alreadySelected = combinedFiles.some(
            (existingFile) =>
              existingFile.name === file.name &&
              existingFile.size === file.size &&
              existingFile.lastModified ===
                file.lastModified
          );

          if (!alreadySelected) {
            combinedFiles.push(file);
          }
        }

        return combinedFiles;
      });
    }

    if (errors.length > 0) {
      setErrorMessage(errors.join("\n"));
    }
  }

  // --------------------------------------------------
  // DRAG AND DROP
  // --------------------------------------------------

  function handleDragOver(event) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event) {
    event.preventDefault();

    setIsDragging(false);

    const files = Array.from(
      event.dataTransfer.files || []
    );

    addSelectedFiles(files);
  }

  // --------------------------------------------------
  // REMOVE A FILE FROM THE UPLOAD QUEUE
  // --------------------------------------------------

  function removeSelectedFile(indexToRemove) {
    setSelectedFiles((previousFiles) =>
      previousFiles.filter(
        (_, index) => index !== indexToRemove
      )
    );
  }

  // --------------------------------------------------
  // UPLOAD DOCUMENTS TO FASTAPI
  // --------------------------------------------------

  async function handleUpload() {
    if (selectedFiles.length === 0 || isUploading) {
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setStatusMessage("");
    setErrorMessage("");

    const filesToUpload = [...selectedFiles];

    const failedFiles = [];
    let successfulUploads = 0;

    try {
      for (let index = 0; index < filesToUpload.length; index++) {
        const file = filesToUpload[index];

        const formData = new FormData();

        formData.append("file", file);

        try {
          const response = await fetch(
            `${API_BASE_URL}/api/documents/upload`,
            {
              method: "POST",
              body: formData,
            }
          );

          let result;

          try {
            result = await response.json();
          } catch {
            result = {};
          }

          if (!response.ok) {
            throw new Error(
              result.detail ||
                `Upload failed with status ${response.status}.`
            );
          }

          if (!result.success || !result.document) {
            throw new Error(
              "The server returned an unexpected response."
            );
          }

          const uploadedDocument = {
            ...result.document,
            original_filename:
              result.document.original_filename ||
              file.name,
            file_size: file.size,
            uploaded_at: new Date().toISOString(),
          };

          setDocuments((previousDocuments) => {
            // Prevent duplicate entries in the UI.
            const alreadyExists = previousDocuments.some(
              (document) =>
                document.document_id ===
                uploadedDocument.document_id
            );

            if (alreadyExists) {
              return previousDocuments;
            }

            return [
              uploadedDocument,
              ...previousDocuments,
            ];
          });

          successfulUploads++;
        } catch (error) {
          console.error(
            `Failed to upload ${file.name}:`,
            error
          );

          failedFiles.push(
            `${file.name}: ${error.message}`
          );
        }

        setUploadProgress(
          Math.round(
            ((index + 1) / filesToUpload.length) * 100
          )
        );
      }

      // Clear successfully uploaded files from the queue.
      const successfulNames = new Set(
        filesToUpload
          .filter(
            (file) =>
              !failedFiles.some((failure) =>
                failure.startsWith(`${file.name}:`)
              )
          )
          .map(
            (file) =>
              `${file.name}-${file.size}-${file.lastModified}`
          )
      );

      setSelectedFiles((previousFiles) =>
        previousFiles.filter(
          (file) =>
            !successfulNames.has(
              `${file.name}-${file.size}-${file.lastModified}`
            )
        )
      );

      if (successfulUploads > 0) {
        setStatusMessage(
          `${successfulUploads} document${
            successfulUploads === 1 ? "" : "s"
          } uploaded and processed successfully.`
        );
      }

      if (failedFiles.length > 0) {
        setErrorMessage(
          `Some files could not be uploaded:\n${failedFiles.join("\n")}`
        );
      }
    } finally {
      setIsUploading(false);
    }
  }

  // --------------------------------------------------
  // FILTER DOCUMENTS
  // --------------------------------------------------

  const filteredDocuments = documents.filter(
    (document) => {
      const filename =
        document.original_filename ||
        document.filename ||
        "";

      return filename
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    }
  );

  const totalChunks = documents.reduce(
    (total, document) =>
      total + (Number(document.chunks) || 0),
    0
  );

  const totalPages = documents.reduce(
    (total, document) =>
      total + (Number(document.pages) || 0),
    0
  );

  // --------------------------------------------------
  // RENDER PAGE
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* PAGE HEADER */}

        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-indigo-600">
              <span>DocuMind AI</span>
              <span className="text-slate-300">/</span>
              <span>Documents</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              My Documents
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Upload your documents and let AI help you
              understand their contents.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </span>

            <span className="text-sm font-medium text-emerald-700">
              Document workspace
            </span>
          </div>
        </header>

        {/* STATISTICS */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Uploaded documents
              </p>

              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-xl">
                📁
              </span>
            </div>

            <p className="mt-4 text-3xl font-bold text-slate-900">
              {documents.length}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Documents in your saved list
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Processed chunks
              </p>

              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-xl">
                🧩
              </span>
            </div>

            <p className="mt-4 text-3xl font-bold text-slate-900">
              {totalChunks}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Text sections stored for retrieval
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Total pages
              </p>

              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl">
                📃
              </span>
            </div>

            <p className="mt-4 text-3xl font-bold text-slate-900">
              {totalPages}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Pages reported by document processing
            </p>
          </div>

        </section>

        {/* UPLOAD SECTION */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">
              Upload documents
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Add files to your AI-powered document workspace.
            </p>
          </div>

          {/* DROP ZONE */}

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (!isUploading) {
                fileInputRef.current?.click();
              }
            }}
            className={`cursor-pointer rounded-2xl border-2 border-dashed px-5 py-10 text-center transition sm:px-10 ${
              isDragging
                ? "border-indigo-500 bg-indigo-50"
                : "border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/50"
            } ${
              isUploading
                ? "cursor-not-allowed opacity-60"
                : ""
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.docx"
              multiple
              onChange={handleFileSelection}
              disabled={isUploading}
              className="hidden"
            />

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-3xl">
              ⬆️
            </div>

            <h3 className="mt-5 text-lg font-semibold text-slate-900">
              Drag and drop your files here
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Or click anywhere in this area to browse files
            </p>

            <p className="mt-4 text-xs text-slate-400">
              Supported formats: PDF, TXT, DOCX
              <span className="mx-2">•</span>
              Maximum size: 10 MB per file
            </p>
          </div>

          {/* SELECTED FILES */}

          {selectedFiles.length > 0 && (
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">
                  Selected files ({selectedFiles.length})
                </h3>

                <button
                  type="button"
                  onClick={() => setSelectedFiles([])}
                  disabled={isUploading}
                  className="text-sm font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50"
                >
                  Clear all
                </button>
              </div>

              <div className="space-y-3">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
                      {getFileIcon(file.name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {file.name}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatFileSize(file.size)}
                        <span className="mx-2">•</span>
                        {getFileExtension(file.name)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeSelectedFile(index);
                      }}
                      disabled={isUploading}
                      aria-label={`Remove ${file.name}`}
                      className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              {/* UPLOAD PROGRESS */}

              {isUploading && (
                <div className="mt-5">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      Processing documents...
                    </span>

                    <span className="text-slate-500">
                      {uploadProgress}%
                    </span>
                  </div>

                  <div
                    className="h-2 overflow-hidden rounded-full bg-slate-200"
                    role="progressbar"
                    aria-valuenow={uploadProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                      style={{
                        width: `${uploadProgress}%`,
                      }}
                    />
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    Your backend is extracting text, generating
                    embeddings, and saving document chunks.
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handleUpload}
                disabled={isUploading || selectedFiles.length === 0}
                className="mt-5 w-full rounded-xl bg-indigo-600 px-5 py-3.5 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {isUploading
                  ? "Processing..."
                  : `Upload ${selectedFiles.length} ${
                      selectedFiles.length === 1
                        ? "document"
                        : "documents"
                    }`}
              </button>
            </div>
          )}

          {/* SUCCESS MESSAGE */}

          {statusMessage && (
            <div
              role="status"
              className="mt-5 whitespace-pre-line rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
            >
              <span className="mr-2">✓</span>
              {statusMessage}
            </div>
          )}

          {/* ERROR MESSAGE */}

          {errorMessage && (
            <div
              role="alert"
              className="mt-5 whitespace-pre-line rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700"
            >
              <p className="mb-1 font-semibold">
                Please check the following:
              </p>

              {errorMessage}

              {errorMessage.toLowerCase().includes("fetch") && (
                <p className="mt-2">
                  Make sure your FastAPI backend is running.
                </p>
              )}
            </div>
          )}

        </section>

        {/* DOCUMENT LIBRARY */}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">

            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Document library
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Review documents uploaded through this browser.
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                🔎
              </span>

              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

          </div>

          {/* EMPTY STATE */}

          {filteredDocuments.length === 0 ? (
            <div className="px-5 py-16 text-center sm:px-10">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                📂
              </div>

              <h3 className="mt-5 text-lg font-semibold text-slate-800">
                {searchQuery
                  ? "No matching documents"
                  : "No documents uploaded yet"}
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                {searchQuery
                  ? "Try searching with a different filename."
                  : "Upload your first document above. Once processed, its information will appear here."}
              </p>

              {!searchQuery && (
                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Choose a document
                </button>
              )}

            </div>
          ) : (

            /* DOCUMENT LIST */

            <div className="divide-y divide-slate-100">

              {filteredDocuments.map((document) => {
                const filename =
                  document.original_filename ||
                  document.filename ||
                  "Untitled document";

                return (
                  <article
                    key={
                      document.id ||
                      document.document_id ||
                      document.filename
                    }
                    className="flex flex-col gap-4 p-5 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:p-6"
                  >

                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-2xl">
                      {getFileIcon(filename)}
                    </div>

                    <div className="min-w-0 flex-1">

                      <h3
                        className="truncate font-semibold text-slate-800"
                        title={filename}
                      >
                        {filename}
                      </h3>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500">

                        <span>
                          {getFileExtension(filename)}
                        </span>

                        <span>
                          {formatDate(document.uploaded_at)}
                        </span>

                        {document.file_size != null && (
                          <span>
                            {formatFileSize(document.file_size)}
                          </span>
                        )}

                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">

                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {document.pages ?? 0} pages
                        </span>

                        <span className="rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                          {document.chunks ?? 0} chunks
                        </span>

                        <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          Processed
                        </span>

                      </div>

                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-center">
                      <span className="text-sm font-medium text-emerald-600">
                        ✓ Ready
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(document)}
                        className="rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>

                  </article>
                );
              })}

            </div>
          )}

          {/* LIBRARY FOOTER */}

          {documents.length > 0 && (
            <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 text-xs text-slate-500 sm:px-6">
              Showing {filteredDocuments.length} of{" "}
              {documents.length} saved document
              {documents.length === 1 ? "" : "s"}.
            </div>
          )}

        </section>

      </div>
    </div>
  );
}

export default Documents;