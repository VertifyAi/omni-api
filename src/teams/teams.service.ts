import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/teams.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { User } from 'src/users/entities/user.entity';
import { UsersAreas } from './entities/users_areas.entity';
import { In } from 'typeorm';
import { UpdateTeamDto } from './dto/update-team.dto';
import { S3Service } from 'src/integrations/aws/s3.service';
import { UploadFileDto } from './dto/upload-image.dto';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private teamsRepository: Repository<Team>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UsersAreas)
    private usersAreasRepository: Repository<UsersAreas>,
    private readonly s3Service: S3Service,
  ) {}

  async create(createTeamDto: CreateTeamDto, companyId: number): Promise<Team> {
    const owner = await this.usersRepository.findOneBy({
      id: createTeamDto.ownerId,
    });

    if (!owner) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const team = this.teamsRepository.create({
      name: createTeamDto.name,
      description: createTeamDto.description,
      companyId,
      ownerId: createTeamDto.ownerId,
    });

    const savedTeam = await this.teamsRepository.save(team);

    if (createTeamDto.members && createTeamDto.members.length > 0) {
      const users = await this.usersRepository.findBy({
        id: In(createTeamDto.members),
      });

      const usersAreasEntries = users.map((user) => {
        return this.usersAreasRepository.create({
          userId: user.id,
          teamId: savedTeam.id,
        });
      });

      await this.usersAreasRepository.save(usersAreasEntries);
    }

    const teamWithRelations = await this.teamsRepository.findOne({
      where: { id: savedTeam.id },
      relations: {
        owner: true,
        members: true,
      },
    });

    return teamWithRelations || savedTeam;
  }

  async findAll(companyId: number): Promise<Team[]> {
    const teams = await this.teamsRepository.find({
      where: { companyId },
      relations: {
        owner: true,
        members: true,
        company: true,
      },
    });

    for (const team of teams) {
      const usersAreas = await this.usersAreasRepository.find({
        where: { teamId: team.id },
        relations: ['user'],
      });

      if (usersAreas.length > 0) {
        const userIds = usersAreas.map((ua) => ua.userId);

        const members = await this.usersRepository.find({
          where: { id: In(userIds) },
        });

        team.members = members;
      } else {
        team.members = [];
      }
    }

    return teams;
  }

  async update(id: number, updateTeamDto: UpdateTeamDto, companyId: number) {
    const team = await this.teamsRepository.findOneBy({ id, companyId });
    if (!team) {
      throw new NotFoundException('Time não encontrado');
    }

    const { members, ...teamData } = updateTeamDto;
    const updatedTeam = this.teamsRepository.merge(team, teamData);
    await this.teamsRepository.save(updatedTeam);

    if (members && members.length > 0) {
      await this.usersAreasRepository.delete({ teamId: id });
      const usersAreasEntries = members.map((userId) => {
        return this.usersAreasRepository.create({
          userId,
          teamId: id,
        });
      });

      await this.usersAreasRepository.save(usersAreasEntries);
    }

    return this.teamsRepository.findOne({
      where: { id },
      relations: {
        owner: true,
        members: true,
      },
    });
  }

  async findOne(id: number) {
    const team = await this.teamsRepository.findOne({
      where: { id },
      relations: {
        owner: true,
        members: true,
      },
    });

    if (!team) {
      throw new NotFoundException('Time não encontrado');
    }

    const usersAreas = await this.usersAreasRepository.find({
      where: { teamId: team.id },
    });

    if (usersAreas.length > 0) {
      const userIds = usersAreas.map((ua) => ua.userId);

      const members = await this.usersRepository.find({
        where: { id: In(userIds) },
      });

      team.members = members;
    } else {
      team.members = [];
    }

    return team;
  }

  async findOneByName(name: string, companyId: number) {
    const team = await this.teamsRepository.findOneBy({ name, companyId });
    if (!team) {
      throw new NotFoundException('Time não encontrado');
    }
    return team;
  }

  async removeTeamById(id: number) {
    const team = await this.teamsRepository.findOneBy({ id });
    if (!team) {
      throw new NotFoundException('Time não encontrado');
    }
    await this.teamsRepository.delete(id);
    return team;
  }

  async uploadImage(id: number, file: UploadFileDto) {
    const team = await this.teamsRepository.findOneBy({ id });
    if (!team) {
      throw new NotFoundException('Time não encontrado');
    }
    
    const imageUrl = await this.s3Service.uploadFile(file);
    team.imageUrl = imageUrl;
    await this.teamsRepository.save(team);
    return team;
  }
}
