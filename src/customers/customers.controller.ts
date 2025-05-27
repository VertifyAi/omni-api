import {
  Controller,
  Get,
  UseGuards,
  Request,
  Param,
  Post,
  Body,
  Put,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { AuthGuard } from 'src/guards/auth.guard';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @UseGuards(AuthGuard)
  @Get()
  async findAll(@Request() req) {
    return this.customersService.findAll(req.user.companyId);
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
}
