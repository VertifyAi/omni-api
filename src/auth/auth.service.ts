import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from 'src/users/entities/user.entity';
import { SignUpDto } from './dto/sign-up.dto';
import * as bcrypt from 'bcrypt';
import { lastValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private companiesService: CompaniesService,
    private jwtService: JwtService,
    private httpService: HttpService,
  ) {}

  async signUp(signUpDto: SignUpDto): Promise<{ access_token: string }> {
    // Validar se as senhas coincidem
    if (signUpDto.password !== signUpDto.passwordConfirmation) {
      throw new BadRequestException('As senhas não coincidem');
    }

    // Verificar se o usuário já existe
    const existingUser = await this.usersService.findOneByEmail(
      signUpDto.email,
    );
    if (existingUser) {
      throw new BadRequestException('Usuário já existe com este email');
    }

    // Criar a empresa primeiro
    const company = await this.companiesService.createCompany({
      name: signUpDto.company.name,
      email: signUpDto.email, // usando o email do usuário
      streetName: signUpDto.company.address.streetName,
      streetNumber: signUpDto.company.address.streetNumber,
      city: signUpDto.company.address.city,
      state: signUpDto.company.address.state,
      phone: signUpDto.company.phone,
    });

    // Criar o usuário administrador
    const fullName = `${signUpDto.firstName} ${signUpDto.lastName}`;
    const user = await this.usersService.create(
      {
        name: fullName,
        email: signUpDto.email,
        password: signUpDto.password,
        role: UserRole.ADMIN,
        streetName: signUpDto.address.streetName,
        streetNumber: signUpDto.address.streetNumber,
        city: signUpDto.address.city,
        state: signUpDto.address.state,
        phone: signUpDto.phone,
      },
      company.id,
    );

    // Enviar email de boas vindas
    await this.sendWelcomeEmail(user.email, signUpDto.firstName);

    // Gerar token JWT
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
      company: company,
    } as User;

    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  async signIn(email: string, pass: string): Promise<{ access_token: string }> {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    const isPasswordValid = await bcrypt.compare(pass, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Senha inválida');
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
      company: user.company,
    } as User;
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }

  private async sendWelcomeEmail(email: string, firstName: string) {
    const response = await lastValueFrom(
      this.httpService.post(
        'https://n8n.vertify.com.br/webhook/5439fb6a-5fc6-45eb-8358-06e8aa67b891',
        {
          email,
          firstName,
        },
      ),
    );
    return response.data;
  }
}
