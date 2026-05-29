"use client";

import { User, UserForm, MaintenanceBillingRole } from "@/types/user";
import { VillaOption } from "@/types/villa";

function isResidentLike(role: string): boolean {
  return role === "RESIDENT" || role === "ADMIN" || role === "RESIDENT_CUM_ADMIN";
}

interface UserFormModalProps {
  formData: UserForm;
  setFormData: (fd: UserForm) => void;
  editingUser: User | null;
  villas: VillaOption[];
  sortedVillas: VillaOption[];
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function UserFormModal({
  formData,
  setFormData,
  editingUser,
  villas,
  sortedVillas,
  submitting,
  onSubmit,
  onClose,
}: UserFormModalProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-xl font-semibold">
          {editingUser ? "Edit user" : "Create New User"}
        </h2>
        {editingUser && (
          <p className="text-sm text-fg-secondary mt-1">
            Username cannot be changed. Leave password empty to keep the current password.
          </p>
        )}
      </div>
      <div className="card-body">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">Username *</label>
              <input
                type="text"
                required
                disabled={!!editingUser}
                minLength={3}
                maxLength={50}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                className="input disabled:bg-surface-elevated disabled:text-fg-secondary"
                placeholder="johndoe123"
              />
              <p className="text-xs text-fg-secondary mt-1">Lowercase, no spaces</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">Full Name *</label>
              <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">Email *</label>
              <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input" placeholder="john@example.com" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">Phone</label>
              <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input" placeholder="+91 9876543210" />
            </div>
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">{editingUser ? "New password (optional)" : "Password *"}</label>
              <input
                type="password"
                required={!editingUser}
                minLength={editingUser ? undefined : 8}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input"
                placeholder={editingUser ? "Leave blank to keep current" : "Min 8 chars, upper+lower+number"}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-fg-primary mb-1">Role *</label>
              <select
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserForm["role"] })}
                className="input"
              >
                <option value="ADMIN">Admin</option>
                <option value="RESIDENT">Resident</option>
                <option value="RESIDENT_CUM_ADMIN">Resident + Admin</option>
                <option value="GUARD">Guard</option>
              </select>
            </div>

            {editingUser && (
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="w-4 h-4 rounded border-surface-border" />
                  <span className="text-sm font-medium text-fg-primary">Account active</span>
                </label>
              </div>
            )}

            {isResidentLike(formData.role) && (
              <>
                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">Resident Type *</label>
                  <select required value={formData.residentType} onChange={(e) => setFormData({ ...formData, residentType: e.target.value as UserForm["residentType"] })} className="input">
                    <option value="OWNER">Owner</option>
                    <option value="TENANT">Tenant</option>
                    <option value="FAMILY_MEMBER">Family Member</option>
                  </select>
                  <p className="text-xs text-fg-secondary mt-1">Owner: Villa owner | Tenant: Renting the villa | Family: Owner&apos;s family</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">Assign Villa *</label>
                  <select required={isResidentLike(formData.role)} value={formData.villaId} onChange={(e) => setFormData({ ...formData, villaId: e.target.value, unitId: "" })} className="input">
                    <option value="">Select a villa</option>
                    {sortedVillas.map((villa) => (
                      <option key={villa.id} value={villa.id}>
                        {villa.villaNumber} {villa.block ? `(Block ${villa.block})` : ""} - {villa.ownerName}
                      </option>
                    ))}
                  </select>
                  {villas.length === 0 && <p className="text-sm text-brand-danger mt-1">No villas available. Please create villas first.</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">Unit / floor *</label>
                  <select
                    required={isResidentLike(formData.role) && Boolean(formData.villaId)}
                    disabled={!formData.villaId}
                    value={formData.unitId}
                    onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                    className="input disabled:bg-surface-elevated"
                  >
                    <option value="">{formData.villaId ? "Select unit" : "Select a property first"}</option>
                    {(villas.find((v) => v.id === formData.villaId)?.units ?? []).map((u) => (
                      <option key={u.id} value={u.id}>{u.label} ({u.unitCode})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-fg-primary mb-1">Move-in Date *</label>
                  <input type="date" required={isResidentLike(formData.role)} value={formData.moveInDate} onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })} className="input" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-fg-primary mb-1">Maintenance billing</label>
                  <select value={formData.maintenanceBillingRole} onChange={(e) => setFormData({ ...formData, maintenanceBillingRole: e.target.value as MaintenanceBillingRole })} className="input">
                    <option value="PRIMARY">Primary — this account pays villa maintenance / billing</option>
                    <option value="EXCLUDED">Excluded — another resident on this villa is the billing contact (tenant / family, etc.)</option>
                  </select>
                  <p className="text-xs text-fg-secondary mt-1">
                    Only one primary payer per villa. Choose &quot;Excluded&quot; only when someone else on the same villa is already active and should receive dues.
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={submitting || (isResidentLike(formData.role) && villas.length === 0)} className="btn btn-primary">
              {submitting ? (editingUser ? "Saving..." : "Creating...") : editingUser ? "Save changes" : "Create User"}
            </button>
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
