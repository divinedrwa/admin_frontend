/**
 * Natural-sort comparator for villa numbers like "V-1", "V-2", "V-10", "A-3", "B-12".
 *
 * Lexical compare puts "V-10" before "V-2"; this comparator splits each label
 * into chunks of digits and non-digits and compares them piece-wise, so the
 * digit chunks are compared numerically.
 *
 * Falsy / missing values are pushed to the end so rows without a villa don't
 * float to the top of the list.
 */
export function compareVillaNumber(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  const av = (a ?? "").trim();
  const bv = (b ?? "").trim();

  if (av === "" && bv === "") return 0;
  if (av === "") return 1;
  if (bv === "") return -1;

  const tokenize = (value: string) =>
    value
      .toUpperCase()
      .split(/(\d+)/)
      .filter((part) => part.length > 0);

  const aParts = tokenize(av);
  const bParts = tokenize(bv);

  const len = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < len; i += 1) {
    const ap = aParts[i];
    const bp = bParts[i];
    if (ap === undefined) return -1;
    if (bp === undefined) return 1;

    const aNum = /^\d+$/.test(ap) ? Number(ap) : null;
    const bNum = /^\d+$/.test(bp) ? Number(bp) : null;

    if (aNum !== null && bNum !== null) {
      if (aNum !== bNum) return aNum - bNum;
      continue;
    }

    const cmp = ap.localeCompare(bp);
    if (cmp !== 0) return cmp;
  }

  return 0;
}

/**
 * Sorts a list of items by a villa-number-like accessor, returning a new array.
 * Stable for equal villa numbers.
 */
export function sortByVillaNumber<T>(
  items: readonly T[],
  getVillaNumber: (item: T) => string | null | undefined,
): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const cmp = compareVillaNumber(getVillaNumber(a.item), getVillaNumber(b.item));
      return cmp !== 0 ? cmp : a.index - b.index;
    })
    .map(({ item }) => item);
}
