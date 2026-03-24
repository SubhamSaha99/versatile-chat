import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Users, UsersDocument } from 'src/schemas/users.schema';
import { LoginDto, RegisterDto } from 'src/dto/auth.dto';
import { comparePassword, hashPassword } from 'src/util/password.util';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Users.name)
    private userModel: Model<UsersDocument>,
    private jwtService: JwtService,
  ) {}

  /**
   * * User Signup
   * @param registerDto
   * @returns Object
   */
  async register(registerDto: RegisterDto) {
    const { email, password } = registerDto;

    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const hashedPassword = await hashPassword(password);

    const user = await this.userModel.create({
      ...registerDto,
      password: hashedPassword,
    });

    const userObj = user.toObject();

    return { id: userObj._id.toString() };
  }

  /**
   * * User login
   * @param loginDto
   * @param ip
   * @returns Object
   */
  async login(loginDto: LoginDto, ip: string) {
    const { email, password } = loginDto;

    const user = await this.userModel.findOne({ email }).select('+password');

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user.lastLogin = new Date();
    user.lastLoginIP = ip;
    await user.save();

    const payload = {
      id: user._id,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload);

    const userObj = user.toObject();

    return {
      id: userObj._id.toString(),
      name: userObj.name,
      email: userObj.email,
      accessToken,
    };
  }
}
