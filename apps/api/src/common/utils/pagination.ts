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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPrismaDelegate = any;

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
export async function paginate<T>(
  delegate: {
    findMany: (args: any) => Promise<T[]>;
    count: (args: { where: any }) => Promise<number>;
  },
  where: any,
  options: PaginationOptions & {
    orderBy?: Record<string, 'asc' | 'desc'>;
    include?: any;
    select?: any;
  } = {},
): Promise<PaginatedResult<T>> {
  const page = options.page || 1;
  const limit = options.limit || 10;

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
