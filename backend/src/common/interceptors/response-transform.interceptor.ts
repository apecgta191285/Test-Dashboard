import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    meta?: {
        total?: number;
        page?: number;
        limit?: number;
    };
}

@Injectable()
export class ResponseTransformInterceptor<T>
    implements NestInterceptor<T, ApiResponse<T>> {
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<ApiResponse<T>> {
        return next.handle().pipe(
            map((data) => {
                // If data already has success property, return as-is
                if (data && typeof data === 'object' && 'success' in data) {
                    return data;
                }

                return {
                    success: true,
                    data,
                    message: 'Success',
                };
            }),
        );
    }
}
