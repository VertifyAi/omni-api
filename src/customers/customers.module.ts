import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { Customer } from './entities/customer.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { TicketsModule } from 'src/tickets/tickets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Customer]), 
    JwtModule, 
    ConfigModule,
    forwardRef(() => TicketsModule),
  ],
  providers: [CustomersService],
  controllers: [CustomersController],
  exports: [CustomersService],
})
export class CustomersModule {}
