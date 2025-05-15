import { Body, Controller, Get, Post, UseGuards, Request, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { FindAllUsersDto } from './dto/find-all-users.dto';
import { GenericFilterDto } from 'src/utils/dto/generic-filter.dto';
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(AuthGuard)
  @Post()
  async create(@Body() createUserDto: CreateUserDto, @Request() req) {
    return await this.usersService.create(createUserDto, req.user.companyId);
  }

  @UseGuards(AuthGuard)
  @Get()
  async findAll(@Request() req, @Query() findAllUsersDto: GenericFilterDto & FindAllUsersDto) {
    return await this.usersService.findAll(req.user.companyId, findAllUsersDto);
  }
}
