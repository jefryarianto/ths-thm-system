import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MailService } from './mail.service';
import { TestMailDto } from './dto/test-mail.dto';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Mail')
@Controller('mail')
@ApiBearerAuth()
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('test')
  @Roles('superadmin')
  async test(@Body() dto: TestMailDto) {
    const sent = await this.mailService.sendMail({
      to: dto.email,
      subject: 'Test Email dari THS-THM System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a56db;">Test Email Berhasil!</h1>
          <p>Halo,</p>
          <p>Email ini adalah <strong>test email</strong> dari sistem THS-THM untuk memverifikasi konfigurasi email telah berfungsi dengan baik.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">
            THS-THM System &mdash; dikirim via Resend
          </p>
        </div>
      `,
    });

    if (sent) {
      return { success: true, message: 'Test email sent successfully' };
    }
    return { success: false, message: 'Test email failed. Check API logs for details.' };
  }
}
