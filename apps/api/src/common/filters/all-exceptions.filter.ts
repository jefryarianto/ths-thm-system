import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getRequestId } from '../utils/request-context';
import { structuredLog } from '../utils/structured-logger';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const requestId = getRequestId();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message =
        typeof res === 'string'
          ? res
          : ((res as Record<string, unknown>).message as string) || message;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'Data sudah ada (duplicate)';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Data tidak ditemukan';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Gagal menghapus atau memperbarui: data masih terikat dengan data lain (foreign key constraint)';
          break;
        case 'P2024':
          status = HttpStatus.GATEWAY_TIMEOUT;
          message = 'Koneksi ke database timeout';
          break;
        case 'P2000':
          status = HttpStatus.BAD_REQUEST;
          message = 'Nilai data terlalu panjang';
          break;
        case 'P2011':
          status = HttpStatus.BAD_REQUEST;
          message = 'Field wajib tidak boleh kosong';
          break;
        case 'P2012':
          status = HttpStatus.BAD_REQUEST;
          message = 'Field wajib hilang';
          break;
        default:
          message = `Database error (${exception.code})`;
      }
    }

    structuredLog(status >= 500 ? 'error' : 'warn', 'error', {
      requestId,
      context: 'http',
      status,
      message,
      errorName: (exception as Error)?.name,
      errorMessage: (exception as Error)?.message,
    });

    response.status(status).json({
      success: false,
      message: Array.isArray(message) ? message[0] : message,
      statusCode: status,
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
}