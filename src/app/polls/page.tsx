"use client";

import { Plus, Vote } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/AdminPageHeader";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";
import { showToast } from "@/components/Toast";
import { parseApiError } from "@/utils/errorHandler";

type Poll = {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  options: PollOption[];
  _count?: { votes: number };
};

type PollOption = {
  id: string;
  optionText: string;
  _count?: { votes: number };
};

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null);
  const [deletingPollId, setDeletingPollId] = useState<string | null>(null);
  
  // Search and filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "closed">("all");
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    options: ["", ""]
  });

  useEffect(() => {
    loadPolls();
  }, []);

  const loadPolls = () => {
    setLoading(true);
    api
      .get("/polls")
      .then((response) => setPolls(response.data.polls ?? []))
      .catch(() => showToast("Failed to load polls", "error"))
      .finally(() => setLoading(false));
  };

  const handleOpenForm = () => {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    setEditingPoll(null);
    setFormData({
      title: "",
      description: "",
      startDate: today.toISOString().split("T")[0],
      endDate: nextMonth.toISOString().split("T")[0],
      options: ["", ""]
    });
    setShowForm(true);
  };

  const handleEdit = (poll: Poll) => {
    setEditingPoll(poll);
    setFormData({
      title: poll.title,
      description: poll.description || "",
      startDate: poll.startDate.split("T")[0],
      endDate: poll.endDate.split("T")[0],
      options: poll.options.map(opt => opt.optionText)
    });
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPoll(null);
    setFormData({
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      options: ["", ""]
    });
  };

  const handleDelete = async (pollId: string) => {
    if (!window.confirm("Are you sure you want to delete this poll? This action cannot be undone.")) {
      return;
    }

    setDeletingPollId(pollId);
    try {
      await api.delete(`/polls/${pollId}`);
      showToast("Poll deleted successfully", "success");
      loadPolls();
    } catch (error: unknown) {
      const message = parseApiError(error, "Failed to delete poll").message;
      showToast(message, "error");
    } finally {
      setDeletingPollId(null);
    }
  };

  const handleAddOption = () => {
    setFormData({ ...formData, options: [...formData.options, ""] });
  };

  const handleRemoveOption = (index: number) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_, i) => i !== index);
      setFormData({ ...formData, options: newOptions });
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      showToast("Please enter a poll title", "error");
      return;
    }

    const validOptions = formData.options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      showToast("Please provide at least 2 options", "error");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description || undefined,
        startDate: `${formData.startDate}T00:00:00.000Z`,
        endDate: `${formData.endDate}T23:59:59.999Z`,
        options: validOptions
      };

      if (editingPoll) {
        await api.put(`/polls/${editingPoll.id}`, payload);
        showToast("Poll updated successfully", "success");
      } else {
        await api.post("/polls", payload);
        showToast("Poll created successfully", "success");
      }
      
      handleCloseForm();
      loadPolls();
    } catch (error: unknown) {
      const message = parseApiError(error, editingPoll ? "Failed to update poll" : "Failed to create poll").message;
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

  const getVotePercentage = (optionVotes: number, totalVotes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((optionVotes / totalVotes) * 100);
  };

  // Filter and search logic
  const filteredPolls = polls.filter((poll) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = poll.title.toLowerCase().includes(query);
      const matchesDesc = poll.description?.toLowerCase().includes(query);
      if (!matchesTitle && !matchesDesc) return false;
    }

    // Status filter
    if (statusFilter === "active" && !poll.isActive) return false;
    if (statusFilter === "closed" && poll.isActive) return false;

    return true;
  });

  const activeCount = polls.filter(p => p.isActive).length;
  const closedCount = polls.filter(p => !p.isActive).length;

  return (
    <AppShell title="Polls & Voting">
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="Community engagement"
          title="Polls & voting"
          description={`Create resident polls, track participation, and manage active or closed votes with clearer visibility.${activeCount || closedCount ? ` ${activeCount} active and ${closedCount} closed polls are currently listed.` : ""}`}
          icon={<Vote className="h-6 w-6" />}
          actions={
            <button onClick={handleOpenForm} className="btn btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Poll
            </button>
          }
        />

        {/* Search and Filters */}
        <div className="filter-bar">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Search polls by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input text-sm"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="input text-sm"
              >
                <option value="all">All Polls ({polls.length})</option>
                <option value="active">Active Only ({activeCount})</option>
                <option value="closed">Closed Only ({closedCount})</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-3 text-sm text-fg-secondary">
            Showing {filteredPolls.length} of {polls.length} polls
          </div>
        </div>

        {showForm && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-xl font-semibold">{editingPoll ? "Edit Poll" : "Create New Poll"}</h2>
            </div>
            <div className="card-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-fg-primary mb-1">
                  Poll Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input"
                  placeholder="e.g., Should we organize a summer fest?"
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
                  placeholder="Add more details about this poll..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-primary mb-2">
                  Poll Options * (minimum 2)
                </label>
                {formData.options.map((option, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      required
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      className="input flex-1"
                      placeholder={`Option ${index + 1}`}
                      maxLength={200}
                    />
                    {formData.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(index)}
                        className="px-3 py-2 bg-denied-bg text-brand-danger rounded hover:bg-denied-bg"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="text-brand-primary hover:text-brand-primary text-sm font-medium"
                >
                  + Add Another Option
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? (editingPoll ? "Updating..." : "Creating...") : (editingPoll ? "Update Poll" : "Create Poll")}
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

        <div className="space-y-4">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner w-10 h-10"></div>
              <p className="loading-state-text">Loading polls...</p>
            </div>
          ) : filteredPolls.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <span className="empty-state-icon">📊</span>
                <p className="empty-state-title">{searchQuery || statusFilter !== "all" ? "No Matching Polls" : "No Polls Created"}</p>
                <p className="empty-state-text">
                  {searchQuery || statusFilter !== "all"
                    ? "No polls match your search criteria."
                    : "Click \"Create Poll\" to get started."}
                </p>
              </div>
            </div>
          ) : (
            filteredPolls.map((poll) => (
              <div key={poll.id} className="card p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-fg-primary">{poll.title}</h3>
                    {poll.description && (
                      <p className="text-fg-secondary mt-1">{poll.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`badge ${
                        poll.isActive
                          ? "badge-success"
                          : "badge-gray"
                      }`}
                    >
                      {poll.isActive ? "Active" : "Closed"}
                    </span>
                    <button
                      onClick={() => handleEdit(poll)}
                      className="p-2 text-brand-primary hover:bg-brand-primary-light rounded"
                      title="Edit poll"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(poll.id)}
                      disabled={deletingPollId === poll.id}
                      className="p-2 text-brand-danger hover:bg-denied-bg rounded disabled:opacity-50"
                      title="Delete poll"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  {poll.options?.map((option) => {
                    const votes = option._count?.votes ?? 0;
                    const totalVotes = poll._count?.votes ?? 0;
                    const percentage = getVotePercentage(votes, totalVotes);

                    return (
                      <div key={option.id} className="border rounded p-3">
                        <div className="flex justify-between mb-2">
                          <span className="font-medium">{option.optionText}</span>
                          <span className="text-fg-secondary">
                            {votes} votes ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-surface-elevated rounded h-2">
                          <div
                            className="bg-brand-primary h-2 rounded"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between text-sm text-fg-secondary border-t pt-3">
                  <span>
                    {formatDate(poll.startDate)} - {formatDate(poll.endDate)}
                  </span>
                  <span>Total Votes: {poll._count?.votes ?? 0}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
