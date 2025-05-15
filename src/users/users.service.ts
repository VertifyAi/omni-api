import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { FindAllUsersDto } from './dto/find-all-users.dto';
import { GenericFilterDto } from 'src/utils/dto/generic-filter.dto';
import { PageService } from 'src/utils/services/page.service';
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly pageService: PageService,
  ) {}

  async findOneByEmail(email: string) {
    return await this.userRepository.findOneBy({
      email,
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
ƒ
  async findOneById(id: number) {
    return await this.userRepository.findOneBy({
      id,
    });
  }

  async findAll(companyId: number, findAllUsersDto: FindAllUsersDto & GenericFilterDto) {
    const where: FindOptionsWhere<User> = {
      companyId,
      ...(findAllUsersDto.role && { role: findAllUsersDto.role }),
    };
    const [users, total] = await this.pageService.paginate(this.userRepository, findAllUsersDto, where);
    return {
      users,
      total,
      page: Number(findAllUsersDto.page),
      pageSize: Number(findAllUsersDto.pageSize),
    };
  }
}
