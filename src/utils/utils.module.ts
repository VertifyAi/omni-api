import { Module } from '@nestjs/common';
import { PageService } from './services/page.service';

@Module({
  providers: [PageService],
  exports: [PageService],
})
export class UtilsModule {}
