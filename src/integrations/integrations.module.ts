import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { Integration } from './entities/integration.entity';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { OpenAIService } from './openai/openai.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Integration]),
    JwtModule,
    ConfigModule,
    HttpModule,
  ],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, OpenAIService],
  exports: [IntegrationsService, OpenAIService],
})
export class IntegrationsModule {}
