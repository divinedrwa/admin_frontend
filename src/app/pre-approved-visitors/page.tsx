"use client";

import { useEffect, useState } from "react";
import { showToast } from "@/components/Toast";
import { api } from "@/lib/api";

export default function PreApprovedVisitorsPage() {
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchVisitors();
  }, []);

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/pre-approved-visitors");
      setVisitors(response.data.visitors || response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch pre-approved visitors");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this pre-approved visitor?")) return;
    
    try {
      await api.delete(`/pre-approved-visitors/${id}`);
      showToast("Pre-approved visitor removed", "success");
      fetchVisitors();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to remove visitor", "error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">✅ Pre-Approved Visitors</h1>
          <p className="text-gray-600">Manage pre-approved visitors for quick entry</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading visitors...</p>
          </div>
        ) : visitors.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No pre-approved visitors found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visitors.map((visitor) => (
              <div key={visitor.id} className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{visitor.name}</h3>
                    <p className="text-sm text-gray-600">{visitor.phone}</p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                    ✅ Approved
                  </span>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <p><span className="text-gray-500">Villa:</span> <span className="font-medium">{visitor.villa?.villaNumber || "N/A"}</span></p>
                  <p><span className="text-gray-500">Valid Until:</span> <span className="font-medium">{visitor.validUntil ? new Date(visitor.validUntil).toLocaleDateString() : "Indefinite"}</span></p>
                  {visitor.purpose && <p><span className="text-gray-500">Purpose:</span> {visitor.purpose}</p>}
                </div>
                <button
                  onClick={() => handleDelete(visitor.id)}
                  className="w-full py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Remove Approval
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
