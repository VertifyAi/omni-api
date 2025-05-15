import { Module } from '@nestjs/common';
import { VeraiService } from './verai.service';
import { VeraiController } from './verai.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [JwtModule, ConfigModule],
  controllers: [VeraiController],
  providers: [VeraiService],
  exports: [VeraiService]
})
export class VeraiModule {}
