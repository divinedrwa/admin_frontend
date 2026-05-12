"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";

type Banner = {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  type: string;
  priority: number;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  actionUrl?: string;
  creator: {
    name: string;
  };
  createdAt: string;
};

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deletingBannerId, setDeletingBannerId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    imageUrl: "",
    type: "ANNOUNCEMENT",
    priority: "0",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    isActive: true,
    actionUrl: ""
  });

  const loadBanners = () => {
    setLoading(true);
    api
      .get("/banners")
      .then((response) => setBanners(response.data.banners ?? []))
      .catch(() => showToast("Failed to load banners", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const handleOpenForm = () => {
    setEditingBanner(null);
    setFormData({
      title: "",
      description: "",
      imageUrl: "",
      type: "ANNOUNCEMENT",
      priority: "0",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      isActive: true,
      actionUrl: ""
    });
    setShowForm(true);
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      description: banner.description || "",
      imageUrl: banner.imageUrl || "",
      type: banner.type,
      priority: banner.priority.toString(),
      startDate: banner.startDate.split("T")[0],
      endDate: banner.endDate ? banner.endDate.split("T")[0] : "",
      isActive: banner.isActive,
      actionUrl: banner.actionUrl || ""
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingBanner(null);
  };

  const handleDelete = async (bannerId: string) => {
    if (!window.confirm("Are you sure you want to delete this banner? This action cannot be undone.")) {
      return;
    }

    setDeletingBannerId(bannerId);
    try {
      await api.delete(`/banners/${bannerId}`);
      showToast("Banner deleted successfully", "success");
      loadBanners();
    } catch (error: unknown) {
      const message = parseApiError(error, "Failed to delete banner").message;
      showToast(message, "error");
    } finally {
      setDeletingBannerId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.type) {
      showToast("Please fill all required fields", "error");
      return;
    }

    setSubmitting(true);

    try {
      const payload: any = {
        title: formData.title,
        type: formData.type,
        priority: parseInt(formData.priority) || 0,
        isActive: formData.isActive
      };

      // Optional fields
      if (formData.description && formData.description.trim()) {
        payload.description = formData.description.trim();
      }
      if (formData.imageUrl && formData.imageUrl.trim()) {
        payload.imageUrl = formData.imageUrl.trim();
      }
      if (formData.startDate) {
        payload.startDate = new Date(formData.startDate).toISOString();
      }
      if (formData.endDate && formData.endDate.trim()) {
        payload.endDate = new Date(formData.endDate).toISOString();
      }
      if (formData.actionUrl && formData.actionUrl.trim()) {
        payload.actionUrl = formData.actionUrl.trim();
      }

      if (editingBanner) {
        await api.put(`/banners/${editingBanner.id}`, payload);
        showToast("Banner updated successfully", "success");
      } else {
        await api.post("/banners", payload);
        showToast("Banner created successfully", "success");
      }

      handleCloseForm();
      loadBanners();
    } catch (error: unknown) {
      const message = parseApiError(error, editingBanner ? "Failed to update banner" : "Failed to create banner").message;
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const getTypeBadge = (type: string) => {
    const badges: Record<string, string> = {
      EVENT: "badge-primary",
      ANNOUNCEMENT: "badge-success",
      FESTIVAL: "badge-info",
      EMERGENCY: "badge-danger",
      MAINTENANCE: "badge-warning",
      OFFER: "badge-info",
      COMMUNITY: "badge-primary",
    };
    return badges[type] || "badge-gray";
  };

  return (
    <AppShell title="Banners & Events">
      <div className="space-y-4">
        <div className="page-action-bar">
          <p className="text-fg-secondary">Manage banners and events for mobile app carousel</p>
          <button
            onClick={handleOpenForm}
            className="btn btn-primary"
          >
            + Create Banner
          </button>
        </div>

        {showForm && (
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-semibold">
                {editingBanner ? "Edit Banner" : "Create New Banner"}
              </h3>
            </div>
            <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input"
                    placeholder="Holi Celebration 2026"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input"
                    required
                  >
                    <option value="EVENT">Event</option>
                    <option value="ANNOUNCEMENT">Announcement</option>
                    <option value="FESTIVAL">Festival</option>
                    <option value="EMERGENCY">Emergency</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="OFFER">Offer</option>
                    <option value="COMMUNITY">Community Activity</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input"
                    rows={3}
                    placeholder="Join us for Holi celebrations at the clubhouse..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="input"
                    placeholder="https://example.com/banner.jpg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Priority (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="input"
                    placeholder="0"
                  />
                  <p className="text-xs text-fg-secondary mt-1">Higher priority shows first</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    End Date (optional)
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="input"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Action URL (Deep Link)
                  </label>
                  <input
                    type="url"
                    value={formData.actionUrl}
                    onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
                    className="input"
                    placeholder="societyapp://events/holi-2026"
                  />
                  <p className="text-xs text-fg-secondary mt-1">Optional deep link for mobile app navigation</p>
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-fg-primary">Active (Visible in app)</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? "Saving..." : (editingBanner ? "Update Banner" : "Create Banner")}
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
            <p className="loading-state-text">Loading banners...</p>
          </div>
        ) : banners.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <span className="empty-state-icon">🎯</span>
              <p className="empty-state-title">No Banners Created</p>
              <p className="empty-state-text">Click &quot;Create Banner&quot; to add one.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="card overflow-hidden"
              >
                {banner.imageUrl && (
                  <div className="h-48 bg-surface-elevated">
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
                
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`badge font-semibold ${getTypeBadge(banner.type)}`}>
                      {banner.type}
                    </span>
                    <span className="text-xs text-fg-secondary">Priority: {banner.priority}</span>
                  </div>

                  <h3 className="font-semibold text-lg mb-2">{banner.title}</h3>
                  
                  {banner.description && (
                    <p className="text-sm text-fg-secondary mb-3 line-clamp-3">{banner.description}</p>
                  )}

                  <div className="text-xs text-fg-secondary space-y-1 mb-3">
                    <p>Start: {formatDate(banner.startDate)}</p>
                    {banner.endDate && <p>End: {formatDate(banner.endDate)}</p>}
                    <p>Created by: {banner.creator.name}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${banner.isActive ? "text-approved-solid" : "text-brand-danger"}`}>
                      {banner.isActive ? "● Active" : "○ Inactive"}
                    </span>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(banner)}
                        className="p-2 text-brand-primary hover:bg-brand-primary-light rounded"
                        title="Edit banner"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(banner.id)}
                        disabled={deletingBannerId === banner.id}
                        className="p-2 text-brand-danger hover:bg-denied-bg rounded disabled:opacity-50"
                        title="Delete banner"
                      >
                        🗑️
                      </button>
                    </div>
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
