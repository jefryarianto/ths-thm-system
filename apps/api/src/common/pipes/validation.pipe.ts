import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseIdPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!value || value.length < 10) {
      throw new BadRequestException('ID tidak valid');
    }
    return value;
  }
}

@Injectable()
export class ParseOptionalIntPipe implements PipeTransform<string, number | undefined> {
  transform(value: string, metadata: ArgumentMetadata): number | undefined {
    if (!value) return undefined;
    const num = parseInt(value, 10);
    if (isNaN(num)) throw new BadRequestException(`${metadata.data} harus berupa angka`);
    return num;
  }
}