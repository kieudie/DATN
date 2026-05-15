export function normalizeCc(cc?: string | string[]): string[] | undefined {
  if (cc == null) return undefined;

  // cc là mảng
  if (Array.isArray(cc)) {
    const list = cc.filter((x) => !!x).map((x) => x.trim());
    return list.length ? list : undefined;
  }

  // cc là string: "a@x.com, b@y.com"
  const list = cc
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return list.length ? list : undefined;
}
