import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseDto } from '../dto/api-response.dto';

/**
 * Transform interceptor for consistent API responses
 * Automatically wraps responses in ApiResponseDto format
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // If data is already an ApiResponseDto, return as is
        if (data instanceof ApiResponseDto) {
          return data;
        }
        // Otherwise, wrap in success response
        return ApiResponseDto.success(data);
      }),
    );
  }
}

