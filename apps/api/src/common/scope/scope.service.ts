import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserScope, isSelfScope } from '../interfaces/user-scope.interface';
import { ROLE_SCOPE, SCOPE_ORDER, hasRequiredScope } from '../guards/scope.guard';
import { ScopeHelper } from '../utils/scope-helpers';

export interface KegiatanScopePrisma {
  wilayah: {
    findUnique: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any[]>;
  };
  ranting: {
    findUnique: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any[]>;
  };
}

@Injectable()
export class ScopeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly helper: ScopeHelper,
  ) {}

  // Facade methods - delegate to helper to preserve exact behavior
  buildScopeFilter(scope: UserScope, basePath: string = 'ranting'): Record<string, unknown> {
    return this.helper.buildScopeFilter(scope, basePath);
  }

  buildIndirectScopeFilter(scope: UserScope, relationPath: string = 'anggota'): Record<string, unknown> {
    return this.helper.buildIndirectScopeFilter(scope, relationPath);
  }

  async buildKegiatanScopeFilter(scope?: UserScope, prisma?: any): Promise<Record<string, unknown>> {
    return this.helper.buildKegiatanScopeFilter(scope, prisma || this.prisma);
  }

  verifyKegiatanScope(
    prisma: KegiatanScopePrisma,
    scope: UserScope | undefined,
    scopeType?: string,
    scopeId?: string,
  ): Promise<void> {
    return this.helper.verifyKegiatanScope(prisma as any, scope, scopeType, scopeId);
  }

  hasAccessToResource(scope: UserScope, resourceRantingId?: string): boolean {
    return this.helper.hasAccessToResource(scope, resourceRantingId);
  }

  async hasAccessToResourceAsync(
    prisma: any,
    scope: UserScope,
    resourceRantingId?: string,
  ): Promise<boolean> {
    return this.helper.hasAccessToResourceAsync(prisma, scope, resourceRantingId);
  }

  async verifyResourceAccess<T extends { rantingId?: string | null }>(
    prisma: any,
    scope: UserScope | undefined,
    resourceId: string,
    findUnique: (prisma: any, id: string) => Promise<T | null>,
    notFoundMessage: string = 'Sumber daya tidak ditemukan',
  ): Promise<T> {
    return this.helper.verifyResourceAccess(prisma, scope, resourceId, findUnique, notFoundMessage);
  }

  buildSelfScopeFilter(
    scope: UserScope | undefined,
    column: string = 'anggotaId',
    relationPath?: string,
  ): Record<string, unknown> {
    return this.helper.buildSelfScopeFilter(scope, column, relationPath);
  }

  isOwnMemberRow(scope: UserScope | undefined, anggotaId?: string | null): boolean {
    return this.helper.isOwnMemberRow(scope, anggotaId);
  }

  selfCacheSegment(scope: UserScope | undefined): string {
    return this.helper.selfCacheSegment(scope);
  }

  isSelfScope(scope?: UserScope | null) {
    return isSelfScope(scope);
  }

  hasRequiredScope(userRole: string, requiredScope: string): boolean {
    return hasRequiredScope(userRole as any, requiredScope as any);
  }

  getRoleScope(role: string): string {
    return ROLE_SCOPE[role] || 'self';
  }

  getScopeOrder() {
    return SCOPE_ORDER;
  }
}
