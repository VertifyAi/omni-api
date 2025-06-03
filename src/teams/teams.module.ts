import { Module } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Team } from './entities/teams.entity';
import { User } from 'src/users/entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { UsersAreas } from './entities/users_areas.entity';
import { S3Service } from 'src/integrations/aws/s3.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Team, User, UsersAreas]),
    JwtModule,
    ConfigModule,
  ],
  providers: [TeamsService, S3Service],
  controllers: [TeamsController],
  exports: [TeamsService],
})
export class TeamsModule {}
