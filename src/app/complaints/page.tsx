"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";

type Complaint = {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  villa: {
    villaNumber: string;
    block: string;
    ownerName: string;
  };
};

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/complaints")
      .then((response) => setComplaints(response.data.complaints ?? []))
      .catch(async (error: unknown) => {
        const { showToast } = await import("@/components/Toast");
        const message =
          (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to load complaints";
        showToast(message, "error");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Complaints">
      <div className="rounded bg-white border border-gray-200 p-4 overflow-x-auto">
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Villa</th>
                <th>Title</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {complaints.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-500">
                    No complaints found
                  </td>
                </tr>
              ) : (
                complaints.map((complaint) => (
                  <tr key={complaint.id} className="border-b">
                    <td className="py-2">
                      {complaint.villa.villaNumber}
                      {complaint.villa.block ? ` (${complaint.villa.block})` : ""}
                    </td>
                    <td>{complaint.title}</td>
                    <td>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          complaint.status === "RESOLVED"
                            ? "bg-green-100 text-green-700"
                            : complaint.status === "IN_PROGRESS"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {complaint.status}
                      </span>
                    </td>
                    <td>{new Date(complaint.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
