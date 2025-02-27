import { Module } from '@nestjs/common';
import { PhonesController } from './phones.controller';
import { PhonesService } from './phones.service';

@Module({
  controllers: [PhonesController],
  providers: [PhonesService]
})
export class PhonesModule {}
