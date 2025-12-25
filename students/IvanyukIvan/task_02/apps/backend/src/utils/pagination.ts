export function parsePagination(query: any) {
  const limitRaw = query.limit;
  const offsetRaw = query.offset;
  let limit = Number(limitRaw ?? 50);
  let offset = Number(offsetRaw ?? 0);
  if (!Number.isFinite(limit) || limit <= 0) limit = 50;
  if (!Number.isFinite(offset) || offset < 0) offset = 0;
  if (limit > 100) limit = 100;
  return { limit, offset };
}
