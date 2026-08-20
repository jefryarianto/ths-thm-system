export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  success: true;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Paginate a Prisma query.
 *
 * @param delegate - The Prisma delegate (e.g., `this.prisma.anggota`)
 * @param where - The Prisma `where` clause
 * @param options - Pagination + query options
 *
 * @example
 *   return paginate(this.prisma.anggota, where, {
 *     page: filter.page, limit: filter.limit,
 *     orderBy: { createdAt: 'desc' },
 *     include: { ranting: true },
 *   });
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function paginate<T>(
  delegate: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    findMany: (args: any) => Promise<T[]>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    count: (args: { where: any }) => Promise<number>;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  where: any,
  options: PaginationOptions & {
    orderBy?: Record<string, 'asc' | 'desc'>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    include?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select?: any;
  } = {},
): Promise<PaginatedResult<T>> {
  const page = options.page || 1;
  // Cap limit untuk mencegah klien meminta jumlah baris tak terbatas
  const MAX_LIMIT = 100;
  const limit = Math.min(options.limit || 10, MAX_LIMIT);

  const queryArgs: Record<string, unknown> = {
    where,
    skip: (page - 1) * limit,
    take: limit,
  };

  if (options.orderBy) queryArgs.orderBy = options.orderBy;
  if (options.include) queryArgs.include = options.include;
  if (options.select) queryArgs.select = options.select;

  const [data, total] = await Promise.all([
    delegate.findMany(queryArgs),
    delegate.count({ where }),
  ]);

  return {
    success: true,
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
