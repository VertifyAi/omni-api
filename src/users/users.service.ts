import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { FindAllUsersDto } from './dto/find-all-users.dto';
import { GenericFilterDto } from 'src/utils/dto/generic-filter.dto';
import { PageService } from 'src/utils/services/page.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { TicketsService } from 'src/tickets/tickets.service';
import { TicketStatus } from 'src/tickets/entities/ticket.entity';
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly pageService: PageService,
    @Inject(forwardRef(() => TicketsService))
    private readonly ticketsService: TicketsService,
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

  /**
   * Obtém o ranking de usuários por score
   * @param companyId ID da empresa
   * @param startDate Data de início
   * @param endDate Data de fim
   * @returns Ranking de usuários por score
   */
  async getRankingUsersByScore(companyId: number, startDate: Date, endDate: Date, teamId?: string) {
    // Buscar tickets fechados no período especificado
    const tickets = await this.ticketsService.getTicketsAnalytics(
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        teamId,
      },
      companyId,
    );

    // Filtrar apenas tickets fechados com score válido e que têm userId
    const closedTicketsWithScore = tickets.tickets.filter(
      (ticket) => 
        ticket.status === TicketStatus.CLOSED && 
        ticket.score !== null && 
        ticket.score !== undefined && 
        ticket.score > 0 &&
        ticket.userId !== null && 
        ticket.userId !== undefined
    );

    // Agrupar tickets por userId e calcular média do score
    const userScores = closedTicketsWithScore.reduce((acc, ticket) => {
      const userId = ticket.userId;
      
      if (!acc[userId]) {
        acc[userId] = { totalScore: 0, count: 0 };
      }
      
      acc[userId].totalScore += ticket.score;
      acc[userId].count += 1;
      
      return acc;
    }, {} as Record<number, { totalScore: number; count: number }>);

    // Buscar informações dos usuários e calcular score médio
    const userRankings: Array<{
      userId: number;
      name: string;
      email: string;
      averageScore: number;
      totalTickets: number;
    }> = [];
    
    for (const [userIdStr, scoreData] of Object.entries(userScores)) {
      const userId = parseInt(userIdStr);
      const user = await this.findOneById(userId, companyId);
      
      if (user) {
        const averageScore = scoreData.totalScore / scoreData.count;
        userRankings.push({
          userId: user.id,
          name: user.name,
          email: user.email,
          averageScore: parseFloat(averageScore.toFixed(2)),
          totalTickets: scoreData.count,
        });
      }
    }

    // Ordenar por maior score médio e retornar os top 10
    return userRankings
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 10);
  }
}
