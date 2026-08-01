"use client";

import { ImagePlus, LayoutTemplate, Link2, Plus, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { EmptyState } from "@/components/EmptyState";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import { parseApiError } from "@/utils/errorHandler";
import { captureError } from "@/lib/captureError";
import {
  BANNER_DEEP_LINK_NONE,
  BANNER_DEEP_LINK_OPTIONS,
  bannerDeepLinkSelectValue,
} from "@/lib/bannerDeepLinks";
import { istIsoFromDateInput, istTodayDateInput } from "@/lib/istDates";

/** HTML date input → ISO start of IST calendar day. */
function dateInputToStartIso(dateStr: string): string {
  return istIsoFromDateInput(dateStr, false);
}

/** HTML date input → ISO end of IST calendar day (inclusive last day). */
function dateInputToEndIso(dateStr: string): string {
  return istIsoFromDateInput(dateStr, true);
}

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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deletingBannerId, setDeletingBannerId] = useState<string | null>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const { confirm, ConfirmUI } = useConfirm();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    imageUrl: "",
    type: "ANNOUNCEMENT",
    priority: "0",
    startDate: istTodayDateInput(),
    endDate: "",
    isActive: true,
    actionUrl: ""
  });

  const loadBanners = (signal?: AbortSignal) => {
    setLoading(true);
    api
      .get("/banners", { signal })
      .then((response) => setBanners(response.data.banners ?? []))
      .catch((error: unknown) => {
        if ((error as { name?: string }).name === "CanceledError") return;
        captureError(error, { source: "banners.loadBanners" });
        showToast(parseApiError(error, "Failed to load banners").message, "error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const controller = new AbortController();
    loadBanners(controller.signal);
    return () => controller.abort();
  }, []);

  const handleOpenForm = () => {
    setEditingBanner(null);
    setFormData({
      title: "",
      description: "",
      imageUrl: "",
      type: "ANNOUNCEMENT",
      priority: "0",
      startDate: istTodayDateInput(),
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
    if (imageFileRef.current) imageFileRef.current.value = "";
  };

  const handleUploadImage = async (file: File) => {
    if (!/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) {
      showToast("Please choose a PNG, JPG or WEBP image", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be 5 MB or smaller", "error");
      return;
    }

    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const response = await api.post<{ imageUrl?: string; url?: string }>(
        "/banners/upload-image",
        fd,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      const uploadedUrl = response.data.imageUrl ?? response.data.url;
      if (!uploadedUrl) {
        showToast("Upload succeeded but no image URL was returned", "error");
        return;
      }
      setFormData((prev) => ({ ...prev, imageUrl: uploadedUrl }));
      showToast("Image uploaded — URL filled in below", "success");
      if (imageFileRef.current) imageFileRef.current.value = "";
    } catch (error: unknown) {
      showToast(parseApiError(error, "Failed to upload image").message, "error");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDelete = async (bannerId: string) => {
    if (!(await confirm({ title: "Delete banner", message: "Are you sure you want to delete this banner? This action cannot be undone.", confirmLabel: "Delete" }))) {
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
      const payload: {
        title: string;
        type: string;
        priority: number;
        isActive: boolean;
        description?: string;
        imageUrl?: string;
        startDate?: string;
        endDate?: string;
        actionUrl?: string;
      } = {
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
        payload.startDate = dateInputToStartIso(formData.startDate);
      }
      if (formData.endDate && formData.endDate.trim()) {
        payload.endDate = dateInputToEndIso(formData.endDate);
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
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Promotions & campaigns"
          title="Banners & events"
          description="Manage home-screen banners, society campaigns, and time-bound highlights for the resident mobile experience."
          icon={<LayoutTemplate className="h-6 w-6" />}
          actions={
            <button onClick={handleOpenForm} className="btn btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Banner
            </button>
          }
        />

        {showForm && (
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <ImagePlus className="h-5 w-5 text-brand-primary" />
                <h3 className="text-lg font-semibold">
                  {editingBanner ? "Edit Banner" : "Create New Banner"}
                </h3>
              </div>
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

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Banner image
                  </label>
                  <p className="text-xs text-fg-secondary mb-2">
                    Upload to Cloudinary or paste an image URL. Works for all banner types
                    (announcement, event, festival, etc.).
                  </p>
                  <div className="flex flex-col gap-3 rounded-lg border border-surface-border bg-surface-elevated p-3 sm:flex-row sm:items-start">
                    {formData.imageUrl ? (
                      <div className="h-28 w-full shrink-0 overflow-hidden rounded-md border border-surface-border bg-surface sm:h-24 sm:w-40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={formData.imageUrl}
                          alt="Banner preview"
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex h-28 w-full items-center justify-center rounded-md border border-dashed border-surface-border text-xs text-fg-tertiary sm:h-24 sm:w-40">
                        No image yet
                      </div>
                    )}
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <input
                        ref={imageFileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleUploadImage(file);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => imageFileRef.current?.click()}
                        disabled={uploadingImage || submitting}
                        className="btn btn-secondary flex w-fit items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        {uploadingImage
                          ? "Uploading…"
                          : formData.imageUrl
                            ? "Replace image"
                            : "Upload image"}
                      </button>
                      <input
                        type="url"
                        value={formData.imageUrl}
                        onChange={(e) =>
                          setFormData({ ...formData, imageUrl: e.target.value })
                        }
                        className="input"
                        placeholder="https://res.cloudinary.com/.../banner.jpg"
                      />
                      {formData.imageUrl ? (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, imageUrl: "" })}
                          className="text-left text-xs font-medium text-brand-danger hover:underline"
                        >
                          Remove image
                        </button>
                      ) : null}
                    </div>
                  </div>
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
                    Mobile app link (optional)
                  </label>
                  <div className="flex items-start gap-2">
                    <Link2 className="h-4 w-4 text-fg-tertiary mt-2.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <select
                        value={bannerDeepLinkSelectValue(formData.actionUrl)}
                        onChange={(e) => {
                          const selected = e.target.value;
                          if (selected === "__custom__") return;
                          setFormData({
                            ...formData,
                            actionUrl: selected === BANNER_DEEP_LINK_NONE ? "" : selected,
                          });
                        }}
                        className="input"
                      >
                        {BANNER_DEEP_LINK_OPTIONS.map((opt) => (
                          <option key={opt.value || "none"} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                        {bannerDeepLinkSelectValue(formData.actionUrl) === "__custom__" ? (
                          <option value="__custom__">Other (existing link)</option>
                        ) : null}
                      </select>
                      {formData.actionUrl ? (
                        <p className="text-xs text-fg-secondary mt-1.5">
                          {BANNER_DEEP_LINK_OPTIONS.find((o) => o.value === formData.actionUrl)
                            ?.hint ?? "Residents tap the banner to open this screen in the app."}
                        </p>
                      ) : (
                        <p className="text-xs text-fg-secondary mt-1.5">
                          Leave as &quot;None&quot; if the banner should not navigate anywhere.
                        </p>
                      )}
                      {bannerDeepLinkSelectValue(formData.actionUrl) === "__custom__" ? (
                        <div className="mt-2 rounded-md border border-surface-border bg-surface-elevated px-3 py-2">
                          <p className="text-xs text-fg-secondary mb-1">
                            This banner has a custom link from an earlier version:
                          </p>
                          <p className="text-xs font-mono text-fg-primary break-all">
                            {formData.actionUrl}
                          </p>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, actionUrl: "" })}
                            className="mt-2 text-xs font-medium text-brand-danger hover:underline"
                          >
                            Remove link
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
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
                  disabled={submitting || uploadingImage}
                  className="btn btn-primary"
                >
                  {uploadingImage
                    ? "Uploading image…"
                    : submitting
                      ? "Saving..."
                      : editingBanner
                        ? "Update Banner"
                        : "Create Banner"}
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
            <EmptyState
              icon={<ImagePlus className="h-12 w-12" />}
              title="No Banners Created"
              description="Click &quot;Create Banner&quot; to add one."
            />
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
                    {/* Native <img>: banner.imageUrl is a free-form URL field (any host). */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
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
      {ConfirmUI}
    </AppShell>
  );
}
