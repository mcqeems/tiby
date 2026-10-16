import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
import type { ApiError, ErrorCode } from "@tiby/ts-shared";

@Catch()
export class ApiErrorExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiErrorExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ErrorCode = "INTERNAL";
    let message = "Internal server error";
    let details: { path: string; message: string }[] | undefined = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === "string") {
        message = res;
      } else if (typeof res === "object" && res !== null) {
        const obj = res as Record<string, unknown>;
        message = (obj.message as string) || exception.message;
        if (obj.code && typeof obj.code === "string") {
          code = obj.code as ErrorCode;
        } else {
          code = this.mapStatusToErrorCode(status);
        }
        if (Array.isArray(obj.details)) {
          details = obj.details as { path: string; message: string }[];
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
      message = exception.message;
    }

    const payload: ApiError = {
      code,
      message,
      ...(details ? { details } : {}),
    };

    response.status(status).json(payload);
  }

  private mapStatusToErrorCode(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return "BAD_REQUEST";
      case HttpStatus.UNAUTHORIZED:
        return "UNAUTHORIZED";
      case HttpStatus.FORBIDDEN:
        return "FORBIDDEN";
      case HttpStatus.NOT_FOUND:
        return "NOT_FOUND";
      case HttpStatus.CONFLICT:
        return "CONFLICT";
      default:
        return "INTERNAL";
    }
  }
}
