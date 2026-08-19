import { Controller, Get } from '@nestjs/common';
import { PublicService } from './public.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Public()
  @Get('berita')
  async getBerita() {
    return this.publicService.getBerita();
  }

  @Public()
  @Get('galeri')
  async getGaleri() {
    return this.publicService.getGaleri();
  }

  @Public()
  @Get('donasi-program')
  async getDonasiProgram() {
    return this.publicService.getDonasiProgram();
  }

  @Public()
  @Get('sejarah')
  async getSejarah() {
    return this.publicService.getSejarah();
  }

  @Public()
  @Get('sambutan')
  async getSambutan() {
    return this.publicService.getSambutan();
  }

  @Public()
  @Get('beranda')
  async getBeranda() {
    return this.publicService.getBeranda();
  }

  @Public()
  @Get('organisasi')
  async getOrganisasi() {
    return this.publicService.getOrganisasi();
  }

  @Public()
  @Get('bank-info')
  async getBankInfo() {
    return this.publicService.getBankInfo();
  }

  @Public()
  @Get('kepengurusan')
  async getKepengurusan() {
    return this.publicService.getKepengurusan();
  }
}
