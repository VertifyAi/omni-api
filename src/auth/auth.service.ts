import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { SignUpDto } from './dto/sign-up.dto';
import { ValidateUserDto } from './dto/validate-user.dto';
import { User } from 'src/users/entities/user.entity';
import { instanceToPlain } from 'class-transformer';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService
  ) {}

  async validateUser(validateUserDto: ValidateUserDto): Promise<Omit<User, 'password'>> {
    const user = await this.usersService.findByEmail(validateUserDto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(validateUserDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return instanceToPlain(user) as Omit<User, 'password'>;
  }

  async login(user: Omit<User, 'password'>) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      areaId: user.area.id,
      companyId: user.company.id
    };

    return {
      access_token: this.jwtService.sign(payload),
      content: payload
    };
  }

  async signUp(signUpDto: SignUpDto): Promise<{ access_token: string }> {
    const user = await this.usersService.create(signUpDto);
    const payload = { 
      email: user.email, 
      sub: user.id,
      role: user.role,
      areaId: user.area?.id
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
