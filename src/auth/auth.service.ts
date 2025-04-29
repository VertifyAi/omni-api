import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signIn(email: string, pass: string): Promise<{ access_token: string }> {
    const user = await this.usersService.findOneByEmail(email);
    if (user?.password !== pass) {
      throw new UnauthorizedException();
    }
    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      streetName: user.streetName,
      streetNumber: user.streetNumber,
      city: user.city,
      state: user.state,
      phone: user.phone,
      areaId: user.areaId,
      companyId: user.companyId,
    } as User;
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
