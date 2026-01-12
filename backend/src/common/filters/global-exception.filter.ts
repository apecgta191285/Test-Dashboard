import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Custom Business Exception for application-specific errors
 */
export class BusinessException extends Error {
    constructor(
        public readonly code: string,
        public readonly message: string,
        public readonly statusCode: number = 400,
    ) {
        super(message);
        this.name = 'BusinessException';
    }
}

/**
 * Global Exception Filter that handles all exceptions
 * and returns a consistent error response format
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let errorCode = 'INTERNAL_ERROR';
        let message = 'An unexpected error occurred';
        let details: any = null;

        // Handle BusinessException
        if (exception instanceof BusinessException) {
            status = exception.statusCode;
            errorCode = exception.code;
            message = exception.message;
        }
        // Handle HttpException (including all NestJS built-in exceptions)
        else if (exception instanceof HttpException) {
            status = exception.getStatus();
            const exceptionResponse = exception.getResponse();

            if (typeof exceptionResponse === 'object') {
                const res = exceptionResponse as any;
                message = Array.isArray(res.message)
                    ? res.message.join(', ')
                    : res.message || exception.message;
                errorCode = res.error || 'HTTP_ERROR';
                details = res.details;
            } else {
                message = exceptionResponse as string;
            }
        }
        // Handle unknown errors
        else if (exception instanceof Error) {
            message = exception.message;
            this.logger.error(
                `Unhandled exception: ${exception.message}`,
                exception.stack,
            );
        }

        // Log error details
        this.logger.error(
            `${request.method} ${request.url} - ${status} - ${message}`,
            exception instanceof Error ? exception.stack : undefined,
        );

        response.status(status).json({
            success: false,
            data: null,
            error: errorCode,
            message,
            ...(details && { details }),
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
}
