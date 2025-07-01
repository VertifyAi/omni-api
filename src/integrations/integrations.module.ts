import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { Integration } from './entities/integration.entity';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { OpenAIService } from './openai/openai.service';
import { S3Service } from './aws/s3.service';
import { FreshdeskModule } from './freshdesk/freshdesk.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Integration]),
    JwtModule,
    ConfigModule,
    HttpModule,
    FreshdeskModule,
  ],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, OpenAIService, S3Service],
  exports: [IntegrationsService, OpenAIService, S3Service],
})
export class IntegrationsModule {}
