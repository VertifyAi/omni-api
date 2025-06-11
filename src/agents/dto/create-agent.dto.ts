import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { AgentObjective, AgentSegment, AgentTone } from '../entities/agent.entity';

export class InteractionExampleDto {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsNotEmpty()
  answer: string;

  @IsString()
  @IsNotEmpty()
  reasoning: string;
}

export class ProductOrServiceKnowledgeBaseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @IsOptional()
  amount: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  ctaType: string;

  @IsString()
  @IsNotEmpty()
  ctaUrl: string;
}

export class CreateAgentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  tone: AgentTone;

  @IsString()
  @IsNotEmpty()
  objective: AgentObjective;

  @IsString()
  @IsNotEmpty()
  segment: AgentSegment;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @IsNotEmpty()
  @IsNumber({}, { each: true })
  @IsOptional()
  teams_to_redirect?: number[];

  @IsString()
  @IsNotEmpty()
  presentation_example: string;

  @IsArray()
  @IsNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => InteractionExampleDto)
  interaction_example: InteractionExampleDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProductOrServiceKnowledgeBaseDto)
  products_or_services_knowledge_base?: ProductOrServiceKnowledgeBaseDto[];
}
