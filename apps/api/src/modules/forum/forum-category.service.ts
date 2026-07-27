import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { BaseCrudService } from '../../common/utils/base-crud.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/forum.dto';

@Injectable()
export class ForumCategoryService extends BaseCrudService<CreateCategoryDto, UpdateCategoryDto> {
  constructor(
    prisma: PrismaService,
    scopeHelper: ScopeHelper,
    cache: CacheService,
  ) {
    super(prisma, scopeHelper, cache, {
      model: 'forumCategory',
      prefix: 'forum:categories:',
      notFound: 'Kategori tidak ditemukan',
      scopeStrategy: 'ranting',
    });
  }

  /** Default include (thread count) + ordering for listing */
  protected readonly DEFAULT_INCLUDE = { _count: { select: { threads: true } } };

  async findAll() {
    return this.baseFindAll(
      'forum:categories',
      () => ({}),
      { include: this.DEFAULT_INCLUDE, orderBy: { order: 'asc' as const } },
    );
  }

  async findOne(id: string) {
    return this.baseFindOne<any>(id, undefined, this.DEFAULT_INCLUDE);
  }

  async create(dto: CreateCategoryDto) {
    return this.baseCreate(dto);
  }

  async update(id: string, dto: UpdateCategoryDto) {
    return this.baseUpdate(id, dto);
  }

  async remove(id: string) {
    return this.baseRemove(id);
  }
}
