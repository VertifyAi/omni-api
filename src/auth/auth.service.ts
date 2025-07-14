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
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ForgotPasswordToken } from './entities/forgot-password-tokens.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { RecoverPasswordDto } from './dto/recover-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private companiesService: CompaniesService,
    private jwtService: JwtService,
    private httpService: HttpService,
    @InjectRepository(ForgotPasswordToken)
    private forgotPasswordTokenRepository: Repository<ForgotPasswordToken>,
  ) {}

  async signUp(
    signUpDto: SignUpDto,
  ): Promise<{ access_token: string; user: User }> {
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
      user: user,
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

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.usersService.findOneByEmail(
      forgotPasswordDto.email,
    );
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    const existingToken = await this.forgotPasswordTokenRepository.findOne({
      where: { email: user.email, used: false, expiresAt: MoreThan(new Date()) },
    });
    if (existingToken) {
      throw new BadRequestException('Já existe um token de recuperação de senha para este usuário');
    }

    const token = await this.jwtService.signAsync({ email: user.email });
    await this.forgotPasswordTokenRepository.save({
      token,
      email: user.email,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 horas
    } as ForgotPasswordToken);
    const resetPasswordUrl = `${process.env.FRONTEND_URL}/recover?token=${token}`;

    await this.sendResetPasswordEmail(user.email, resetPasswordUrl);
  }

  async recoverPassword(recoverPasswordDto: RecoverPasswordDto) {
    const forgotPasswordToken =
      await this.forgotPasswordTokenRepository.findOne({
        where: {
          token: recoverPasswordDto.token,
          used: false,
          expiresAt: MoreThan(new Date()),
        },
      });
    if (!forgotPasswordToken) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
    await this.forgotPasswordTokenRepository.update(forgotPasswordToken.id, {
      used: true,
      usedAt: new Date(),
    });
    const user = await this.usersService.findOneByEmail(
      forgotPasswordToken.email,
    );
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }
    await this.usersService.updatePassword(
      user.id,
      recoverPasswordDto.password,
    );
    return { message: 'Senha atualizada com sucesso' };
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

  private async sendResetPasswordEmail(
    email: string,
    resetPasswordUrl: string,
  ) {
    try {
      const response = await lastValueFrom(
        this.httpService.post(
          'https://n8n.vertify.com.br/webhook/da8eefce-abd8-42df-a6d4-6649654ea653',
          {
            email,
            resetPasswordUrl,
          },
        ),
      );

      return response.data;
    } catch (error) {
      console.error(error);
    }
  }
}
