import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ScopeHelper } from '../../common/utils/scope-helpers';
import { CacheService } from '../../common/services/cache.service';
import { BaseCrudService } from '../../common/utils/base-crud.service';
import {
  CreateAspectDto,
  UpdateAspectDto,
  AssessmentFilterDto,
} from './dto/assessment.dto';

@Injectable()
export class AspectService extends BaseCrudService<CreateAspectDto, UpdateAspectDto> {
  constructor(
    prisma: PrismaService,
    scopeHelper: ScopeHelper,
    cache: CacheService,
  ) {
    super(prisma, scopeHelper, cache, {
      model: 'aspekPenilaian',
      prefix: 'aspects:',
      notFound: 'Aspek tidak ditemukan',
      // NOTE: original deleteAspect set isActive:false instead of hard-delete
      // softDelete: true would set deletedAt which doesn't exist on this model
      scopeStrategy: 'ranting',
    });
  }

  /** Include item child relations by default. */
  protected readonly DEFAULT_INCLUDE = { itemPenilaian: true };

  async findAll(query?: AssessmentFilterDto) {
    const limit = query?.limit || 10;
    const page = query?.page || 1;
    const where = query?.search
      ? { namaAspek: { contains: query.search, mode: 'insensitive' as const } }
      : {};
    return this.baseFindAll(
      `aspects:all:${limit}:${page}`,
      () => where,
      { page, limit, include: this.DEFAULT_INCLUDE },
    );
  }

  async findOne(id: string) {
    return this.baseFindOne<any>(id, undefined, this.DEFAULT_INCLUDE);
  }

  async create(dto: CreateAspectDto) {
    return this.baseCreate(dto);
  }

  async update(id: string, dto: UpdateAspectDto) {
    return this.baseUpdate(id, dto);
  }

  /**
   * Override baseRemove: original behavior set isActive:false (soft-disable),
   * not a hard delete or soft delete via deletedAt.
   */
  async remove(id: string) {
    await this.verifyScope(id, undefined);
    await this.prismaDelegate.update({
      where: { id },
      data: { isActive: false },
    });
    this.invalidateCache();
    return { message: 'Aspek penilaian dinonaktifkan' };
  }
}
