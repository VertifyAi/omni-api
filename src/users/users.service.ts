import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { FindAllUsersDto } from './dto/find-all-users.dto';
import { GenericFilterDto } from 'src/utils/dto/generic-filter.dto';
import { PageService } from 'src/utils/services/page.service';
import { UpdateUserDto } from './dto/update-user.dto';
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly pageService: PageService,
  ) {}

  async findOneByEmail(email: string) {
    return await this.userRepository.findOne({
      where: {
        email,
      },
      relations: ['company'],
    });
  }

  async create(createUserDto: CreateUserDto, companyId: number) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      saltRounds,
    );
    const user = this.userRepository.create({
      ...createUserDto,
      companyId,
      password: hashedPassword,
    });
    await this.userRepository.save(user);
    return user;
  }

  async findOneById(id: number, companyId: number) {
    return await this.userRepository.findOne({
      where: {
        id,
        companyId,
      },
    });
  }

  async findAll(
    companyId: number,
    findAllUsersDto: FindAllUsersDto & GenericFilterDto,
  ) {
    const where: FindOptionsWhere<User> = {
      companyId,
      ...(findAllUsersDto.role && { role: findAllUsersDto.role }),
    };
    const [users, total] = await this.pageService.paginate(
      this.userRepository,
      findAllUsersDto,
      where,
    );
    return {
      users,
      total,
      page: Number(findAllUsersDto.page),
      pageSize: Number(findAllUsersDto.pageSize),
    };
  }

  async update(companyId: number, id: string, updateUserDto: UpdateUserDto) {
    try {
      const user = await this.findOneById(Number(id), companyId);
      if (!user) {
        throw new NotFoundException('Usuário não encontrado');
      }

      if (updateUserDto.password) {
        const saltRounds = 10;
        updateUserDto.password = await bcrypt.hash(
          updateUserDto.password,
          saltRounds,
        );
      }

      const updatedUser = await this.userRepository.save({
        ...user,
        name: updateUserDto.name ?? user.name,
        email: updateUserDto.email ?? user.email,
        role: updateUserDto.role ?? user.role,
        streetName: updateUserDto.street_name ?? user.streetName,
        streetNumber: updateUserDto.street_number ?? user.streetNumber,
        city: updateUserDto.city ?? user.city,
        state: updateUserDto.state ?? user.state,
        phone: updateUserDto.phone ?? user.phone,
        areaId: updateUserDto.areaId ?? user.areaId,
        ...(updateUserDto.password && { password: updateUserDto.password }),
      });

      return updatedUser;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Erro ao atualizar usuário: ${error.message}`);
    }
  }
}
