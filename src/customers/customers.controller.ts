import {
  Controller,
  Get,
  UseGuards,
  Request,
  Param,
  Post,
  Body,
  Put,
  Query,
  UseInterceptors,
  UploadedFile,
  Delete,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { FindAllCustomersDto } from './dto/find-all-customers.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadFileDto } from './dto/upload-image.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @UseGuards(AuthGuard)
  @Get()
  async findAll(
    @Request() req,
    @Query() findAllCustomersDto: FindAllCustomersDto,
  ) {
    return this.customersService.findAll(
      req.user.companyId,
      findAllCustomersDto,
    );
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  async findOne(@Request() req, @Param('id') id: string) {
    return this.customersService.findOne(req.user.companyId, id);
  }

  @UseGuards(AuthGuard)
  @Post()
  async create(@Request() req, @Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create({
      ...createCustomerDto,
      companyId: req.user.companyId,
    });
  }

  @UseGuards(AuthGuard)
  @Put(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(
      req.user.companyId,
      id,
      updateCustomerDto,
    );
  }

  @UseGuards(AuthGuard)
  @Post(':id/upload-image')
  @UseInterceptors(FileInterceptor('image'))
  uploadImage(@Param('id') id: string, @UploadedFile() file: UploadFileDto) {
    return this.customersService.uploadImage(id, file);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  delete(@Request() req, @Param('id') id: string) {
    return this.customersService.delete(req.user.companyId, id);
  }
}
