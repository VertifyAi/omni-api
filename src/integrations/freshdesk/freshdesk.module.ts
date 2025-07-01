import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FreshdeskService } from './freshdesk.service';
import { FreshdeskEventListener } from './freshdesk-event.listener';
import { IntegrationsService } from '../integrations.service';
import { Integration } from '../entities/integration.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([Integration]),
  ],
  providers: [
    FreshdeskService,
    FreshdeskEventListener,
    IntegrationsService,
  ],
  exports: [
    FreshdeskService,
  ],
})
export class FreshdeskModule {} 