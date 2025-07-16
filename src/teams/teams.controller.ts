import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Put,
  Param,
  Delete,
  UploadedFile,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { UpdateTeamDto } from './dto/update-team.dto';
import { Roles } from 'src/decorators/roles.decorator';
import { UserRole } from 'src/users/entities/user.entity';
import { RolesGuard } from 'src/guards/roles.guard';
import { UploadFileDto } from './dto/upload-image.dto';
import { FindAllTeamsDto } from './dto/find-all-teams.dto';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post()
  create(@Body() createTeamDto: CreateTeamDto, @Request() req) {
    return this.teamsService.create(createTeamDto, req.user.companyId);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get()
  findAll(@Request() req, @Query() findAllTeamsDto: FindAllTeamsDto,) {
    return this.teamsService.findAll(req.user.companyId, findAllTeamsDto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateTeamDto: UpdateTeamDto,
    @Request() req,
  ) {
    return this.teamsService.update(
      Number(id),
      updateTeamDto,
      req.user.companyId,
    );
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teamsService.findOne(Number(id));
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.teamsService.removeTeamById(Number(id));
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @Post(':id/upload-image')
  @UseInterceptors(FileInterceptor('image'))
  uploadImage(@Param('id') id: string, @UploadedFile() file: UploadFileDto) {
    return this.teamsService.uploadImage(Number(id), file);
  }
}
