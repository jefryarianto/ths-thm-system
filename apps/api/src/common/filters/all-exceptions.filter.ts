import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message || message;
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
        default:
          message = 'Database error';
      }
    }

    response.status(status).json({
      success: false,
      message: Array.isArray(message) ? message[0] : message,
      statusCode: status,
      timestamp: new Date().toISOString(),
    });
  }
}