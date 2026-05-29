"use client";

import type { AuditRow } from "./types";

export interface AuditLogTabProps {
  auditRows: AuditRow[];
}

export function AuditLogTab({ auditRows }: AuditLogTabProps) {
  return (
    <div className="table-wrapper">
      <table className="table">
        <thead className="table-head">
          <tr>
            <th scope="col" className="table-th">When (UTC)</th>
            <th scope="col" className="table-th">Action</th>
            <th scope="col" className="table-th">Entity</th>
            <th scope="col" className="table-th">Meta</th>
          </tr>
        </thead>
        <tbody>
          {auditRows.map((a) => (
            <tr key={a.id} className="table-row">
              <td className="table-td whitespace-nowrap text-xs">{new Date(a.createdAt).toISOString()}</td>
              <td className="table-td font-mono text-xs">{a.action}</td>
              <td className="table-td text-xs">
                {a.entityType} {a.entityId ? `(${a.entityId.slice(0, 8)}…)` : ""}
              </td>
              <td className="table-td text-xs max-w-md truncate" title={JSON.stringify(a.metadata)}>
                {JSON.stringify(a.metadata)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
