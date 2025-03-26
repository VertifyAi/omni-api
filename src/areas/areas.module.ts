import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AreasController } from './areas.controller';
import { AreasService } from './areas.service';
import { Area } from './entities/area.entity';
import { Company } from 'src/companies/entities/company.entity';
import { User } from 'src/users/entities/user.entity';
import { UsersModule } from 'src/users/users.module';
import { CompaniesModule } from 'src/companies/companies.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Area, Company, User]),
    forwardRef(() => CompaniesModule),
    forwardRef(() => UsersModule)
  ],
  controllers: [AreasController],
  providers: [AreasService],
  exports: [AreasService]
})
export class AreasModule {}
