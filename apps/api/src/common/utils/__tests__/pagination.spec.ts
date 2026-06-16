import { paginate } from '../pagination';

describe('paginate', () => {
  const mockFindMany = jest.fn();
  const mockCount = jest.fn();

  const delegate = {
    findMany: mockFindMany,
    count: mockCount,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return paginated results with default page and limit', async () => {
    const data = [{ id: '1' }, { id: '2' }];
    mockFindMany.mockResolvedValue(data);
    mockCount.mockResolvedValue(10);

    const result = await paginate(delegate, {}, {});

    expect(result.success).toBe(true);
    expect(result.data).toEqual(data);
    expect(result.meta).toEqual({ page: 1, limit: 10, total: 10, totalPages: 1 });
    expect(mockFindMany).toHaveBeenCalledWith({
      where: {},
      skip: 0,
      take: 10,
    });
    expect(mockCount).toHaveBeenCalledWith({ where: {} });
  });

  it('should paginate with custom page and limit', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(50);

    await paginate(delegate, {}, { page: 3, limit: 20 });

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {},
      skip: 40,
      take: 20,
    });
  });

  it('should calculate totalPages correctly', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(25);

    const result = await paginate(delegate, {}, { page: 1, limit: 10 });

    expect(result.meta.totalPages).toBe(3);
  });

  it('should pass orderBy, include, and select options to findMany', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    await paginate(
      delegate,
      { status: 'active' },
      {
        page: 1,
        limit: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: true },
        select: { id: true },
      },
    );

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { status: 'active' },
      skip: 0,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
      select: { id: true },
    });
  });

  it('should return empty data array when no results', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const result = await paginate(delegate, {}, {});

    expect(result.data).toEqual([]);
    expect(result.meta.total).toBe(0);
    expect(result.meta.totalPages).toBe(0);
  });
});
