import { VillaOption } from "@/types/villa";

/** Display label for villa pickers: number, optional block, owner. */
export function formatVillaLabel(villa: Pick<VillaOption, "villaNumber" | "block" | "ownerName">): string {
  const block = villa.block?.trim();
  const parts = [`Villa ${villa.villaNumber}`];
  if (block) parts.push(`Block ${block}`);
  if (villa.ownerName?.trim()) parts.push(villa.ownerName.trim());
  return parts.join(" · ");
}
