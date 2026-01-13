export function getPagination(limitRaw?: string, offsetRaw?: string, pageRaw?: string, defaultLimit = 50, maxLimit = 100) {
  const limitNum = Number(limitRaw ?? defaultLimit);
  const offsetNum = Number(offsetRaw ?? 0);
  const pageNum = Number(pageRaw ?? 1);

  const limit = Number.isFinite(limitNum) && limitNum > 0 ? Math.min(limitNum, maxLimit) : defaultLimit;
  
  // If page is provided, calculate offset from page
  let offset: number;
  if (pageRaw && Number.isFinite(pageNum) && pageNum > 0) {
    offset = (pageNum - 1) * limit;
  } else {
    offset = Number.isFinite(offsetNum) && offsetNum >= 0 ? offsetNum : 0;
  }

  return { limit, offset, page: pageRaw ? pageNum : Math.floor(offset / limit) + 1 };
}

export function formatPaginatedResponse<T>(items: T[], total: number, limit: number, offset: number, page?: number) {
  const currentPage = page ?? Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  
  return {
    data: items,
    pagination: {
      page: currentPage,
      limit,
      total,
      totalPages
    }
  };
}