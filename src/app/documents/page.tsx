"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";

type Document = {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: string;
  fileSize?: number;
  category?: string;
  isPublic: boolean;
  createdAt: string;
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    fileUrl: "",
    fileType: "",
    category: "GENERAL",
    isPublic: true
  });

  const loadDocuments = () => {
    setLoading(true);
    api
      .get("/documents")
      .then((response) => setDocuments(response.data.documents ?? []))
      .catch(() => showToast("Failed to load documents", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  // Filter and search logic
  const filteredDocuments = documents.filter((doc) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = doc.title.toLowerCase().includes(query);
      const matchesDesc = doc.description?.toLowerCase().includes(query);
      if (!matchesTitle && !matchesDesc) return false;
    }
    if (categoryFilter !== "all" && doc.category !== categoryFilter) return false;
    return true;
  });

  const handleOpenForm = () => {
    setEditingDocument(null);
    setFormData({
      title: "",
      description: "",
      fileUrl: "",
      fileType: "",
      category: "GENERAL",
      isPublic: true
    });
    setShowForm(true);
  };

  const handleEdit = (doc: Document) => {
    setEditingDocument(doc);
    setFormData({
      title: doc.title,
      description: doc.description || "",
      fileUrl: doc.fileUrl,
      fileType: doc.fileType,
      category: doc.category || "GENERAL",
      isPublic: doc.isPublic
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingDocument(null);
  };

  const handleDelete = async (documentId: string) => {
    if (!window.confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
      return;
    }

    setDeletingDocumentId(documentId);
    try {
      await api.delete(`/documents/${documentId}`);
      showToast("Document deleted successfully", "success");
      loadDocuments();
    } catch (error: unknown) {
      const message = parseApiError(error, "Failed to delete document").message;
      showToast(message, "error");
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.fileUrl) {
      showToast("Please fill all required fields", "error");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description || undefined,
        fileUrl: formData.fileUrl,
        fileType: formData.fileType || "application/pdf",
        category: formData.category,
        isPublic: formData.isPublic
      };

      if (editingDocument) {
        await api.put(`/documents/${editingDocument.id}`, payload);
        showToast("Document updated successfully", "success");
      } else {
        await api.post("/documents", payload);
        showToast("Document uploaded successfully", "success");
      }

      handleCloseForm();
      loadDocuments();
    } catch (error: unknown) {
      const message = parseApiError(error, editingDocument ? "Failed to update document" : "Failed to upload document").message;
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return "📄";
    if (type.includes("image")) return "🖼️";
    if (type.includes("word") || type.includes("doc")) return "📝";
    if (type.includes("excel") || type.includes("sheet")) return "📊";
    return "📎";
  };

  return (
    <AppShell title="Documents & Files">
      <div className="space-y-4">
        <div className="page-action-bar">
          <p className="text-fg-secondary">Manage society documents and files</p>
          <button
            onClick={handleOpenForm}
            className="btn btn-primary"
          >
            + Upload Document
          </button>
        </div>

        {/* Search and Filters */}
        <div className="filter-bar">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Search by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input text-sm"
              />
            </div>
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input text-sm"
              >
                <option value="all">All Categories</option>
                <option value="GENERAL">General</option>
                <option value="FINANCIAL">Financial</option>
                <option value="LEGAL">Legal</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="NOTICE">Notice</option>
                <option value="POLICY">Policy</option>
              </select>
            </div>
          </div>
          <div className="mt-3 text-sm text-fg-secondary">
            Showing {filteredDocuments.length} of {documents.length} documents
          </div>
        </div>

        {showForm && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">{editingDocument ? "Edit Document" : "Upload New Document"}</h2>
            </div>
            <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input"
                  placeholder="e.g., Society Bylaws 2024"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  placeholder="Brief description of the document..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">
                  File URL *
                </label>
                <input
                  type="url"
                  required
                  value={formData.fileUrl}
                  onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                  className="input"
                  placeholder="https://..."
                />
                <p className="text-xs text-fg-secondary mt-1">Upload file to cloud storage and provide URL</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input"
                  >
                    <option value="GENERAL">General</option>
                    <option value="FINANCIAL">Financial</option>
                    <option value="LEGAL">Legal</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="NOTICE">Notice</option>
                    <option value="POLICY">Policy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    File Type (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.fileType}
                    onChange={(e) => setFormData({ ...formData, fileType: e.target.value })}
                    className="input"
                    placeholder="e.g., application/pdf"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="isPublic" className="text-sm text-fg-primary">
                  Make this document publicly accessible to all residents
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? (editingDocument ? "Updating..." : "Uploading...") : (editingDocument ? "Update Document" : "Upload Document")}
                </button>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner w-10 h-10"></div>
            <p className="loading-state-text">Loading documents...</p>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <span className="empty-state-icon">📁</span>
              <p className="empty-state-title">{searchQuery || categoryFilter !== "all" ? "No Matching Documents" : "No Documents Uploaded"}</p>
              <p className="empty-state-text">
                {searchQuery || categoryFilter !== "all" ? "No documents match your search criteria." : "Click \"Upload Document\" to add one."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="card p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">{getFileIcon(doc.fileType)}</div>
                  <span className={`badge ${
                    doc.isPublic ? "badge-success" : "badge-gray"
                  }`}>
                    {doc.isPublic ? "Public" : "Private"}
                  </span>
                </div>

                <h3 className="font-bold text-fg-primary mb-2">{doc.title}</h3>
                {doc.description && (
                  <p className="text-sm text-fg-secondary mb-3 line-clamp-2">{doc.description}</p>
                )}

                <div className="space-y-1 text-xs text-fg-secondary mb-4">
                  <p>Category: {doc.category || "General"}</p>
                  <p>Uploaded: {formatDate(doc.createdAt)}</p>
                  {doc.fileSize && <p>Size: {Math.round(doc.fileSize / 1024)} KB</p>}
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => window.open(doc.fileUrl, "_blank")}
                    className="btn btn-primary w-full text-sm"
                  >
                    View Document
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(doc)}
                      className="flex-1 py-1.5 text-brand-primary border border-brand-primary rounded hover:bg-brand-primary-light text-sm"
                      title="Edit document"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingDocumentId === doc.id}
                      className="flex-1 py-1.5 text-brand-danger border border-brand-danger rounded hover:bg-denied-bg text-sm disabled:opacity-50"
                      title="Delete document"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
