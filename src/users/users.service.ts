import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly ticketRepository: Repository<User>,
  ) {}

  async findOne(email: string): Promise<User | null> {
    return this.ticketRepository.findOne({ where: { email } });
  }
}
