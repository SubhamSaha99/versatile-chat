import { Body, Controller, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from 'src/dto/auth.dto';
import { ApiResponse } from 'src/util/api-response.util';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);

    if (result?.id) {
      return ApiResponse.created('User Signedup Successfully.', result);
    }
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: any) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const result = await this.authService.login(loginDto, ip);

    return ApiResponse.success('Login successful', result);
  }
}
