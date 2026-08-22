import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FeatureFlagsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllFlags() {
    return this.prisma.featureFlag.findMany();
  }

  async getFlag(key: string) {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { key },
    });
    if (!flag) {
      throw new NotFoundException(`Feature flag ${key} not found`);
    }
    return flag;
  }

  async setFlag(key: string, isEnabled: boolean) {
    return this.prisma.featureFlag.upsert({
      where: { key },
      update: { isEnabled },
      create: { key, isEnabled },
    });
  }

  async isEnabled(key: string): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { key },
    });
    return flag?.isEnabled ?? false;
  }
}