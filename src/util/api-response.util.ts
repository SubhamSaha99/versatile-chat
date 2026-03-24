import { HttpStatus } from '@nestjs/common';

export class ApiResponse {
  static success<T>(
    message = 'Success',
    data?: T,
    statusCode: number = HttpStatus.OK,
  ) {
    return {
      success: true,
      message,
      statusCode,
      data,
    };
  }

  static created<T>(
    message = 'Resource created',
    data?: T,
    statusCode: number = HttpStatus.CREATED,
  ) {
    return {
      success: true,
      message,
      statusCode,
      data,
    };
  }
}