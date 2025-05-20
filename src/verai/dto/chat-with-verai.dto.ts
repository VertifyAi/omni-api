import { IsOptional, IsString, IsNotEmpty, IsArray, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OnboardingQuestion {
  @IsString()
  @IsNotEmpty()
  question: string;

  @IsString()
  @IsNotEmpty()
  field: string;
}

export class Team {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}

export class ChatWithVerAiDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OnboardingQuestion)
  onboardingQuestions?: OnboardingQuestion[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Team)
  teams?: Team[];

  @IsOptional()
  @IsObject()
  userInfo?: Record<string, string | number | boolean>;
} 