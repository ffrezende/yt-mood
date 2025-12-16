/**
 * Standard API response DTOs
 * Ensures consistent response format across all endpoints
 */

export class ApiResponseDto<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorDto;
  message?: string;

  constructor(success: boolean, data?: T, error?: ApiErrorDto, message?: string) {
    this.success = success;
    this.data = data;
    this.error = error;
    this.message = message;
  }

  static success<T>(data: T, message?: string): ApiResponseDto<T> {
    return new ApiResponseDto(true, data, undefined, message);
  }

  static error(error: ApiErrorDto, message?: string): ApiResponseDto<never> {
    return new ApiResponseDto(false, undefined, error, message);
  }
}

export class ApiErrorDto {
  message: string;
  code?: string;
  statusCode?: number;
  details?: any;

  constructor(message: string, code?: string, statusCode?: number, details?: any) {
    this.message = message;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

