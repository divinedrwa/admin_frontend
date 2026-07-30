/** Curated in-app destinations for banner / event action links (resident mobile app). */
export type BannerDeepLinkOption = {
  label: string;
  value: string;
  hint?: string;
};

export const BANNER_DEEP_LINK_NONE = "";

export const BANNER_DEEP_LINK_OPTIONS: BannerDeepLinkOption[] = [
  { label: "None — no link", value: BANNER_DEEP_LINK_NONE },
  { label: "Home", value: "societyapp://home", hint: "Resident home tab" },
  {
    label: "Community — Notices",
    value: "societyapp://community/notices",
    hint: "Community tab → Notices",
  },
  {
    label: "Community — Polls",
    value: "societyapp://community/polls",
    hint: "Community tab → Polls",
  },
  {
    label: "Community — Events",
    value: "societyapp://community/events",
    hint: "Community tab → Events & banners",
  },
  {
    label: "Community — Documents",
    value: "societyapp://community/docs",
    hint: "Community tab → Documents",
  },
  { label: "Visitors", value: "societyapp://visitors", hint: "Visitor hub" },
  {
    label: "Pre-approve visitor",
    value: "societyapp://visitors/pre-approve",
    hint: "Invite a guest",
  },
  {
    label: "Maintenance & bills",
    value: "societyapp://maintenance",
    hint: "Maintenance hub",
  },
  { label: "Amenities", value: "societyapp://amenities", hint: "Book amenities" },
  {
    label: "Raise complaint",
    value: "societyapp://complaints/new",
    hint: "New complaint form",
  },
  { label: "My complaints", value: "societyapp://complaints", hint: "Complaint list" },
  { label: "Parcels", value: "societyapp://parcels", hint: "Parcel locker" },
  {
    label: "Society expenses",
    value: "societyapp://expenses",
    hint: "Transparency expenses",
  },
  {
    label: "Community directory",
    value: "societyapp://directory",
    hint: "Resident directory",
  },
  { label: "Emergency SOS", value: "societyapp://sos", hint: "SOS screen" },
];

const KNOWN_VALUES = new Set(
  BANNER_DEEP_LINK_OPTIONS.map((o) => o.value).filter(Boolean),
);

/** Dropdown value; unknown stored URLs map to `__custom__` when editing. */
export function bannerDeepLinkSelectValue(actionUrl: string | undefined | null): string {
  const trimmed = (actionUrl ?? "").trim();
  if (!trimmed) return BANNER_DEEP_LINK_NONE;
  if (KNOWN_VALUES.has(trimmed)) return trimmed;
  return "__custom__";
}

export function bannerDeepLinkLabel(actionUrl: string): string | null {
  const opt = BANNER_DEEP_LINK_OPTIONS.find((o) => o.value === actionUrl);
  return opt?.label ?? null;
}
