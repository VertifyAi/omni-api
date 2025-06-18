import { IsString, IsNotEmpty, IsNumber, IsArray, IsOptional } from 'class-validator';

export class CreateWorkflowDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  flowData: string;

  @IsNumber()
  @IsOptional()
  workflowUserId: number;

  @IsNumber()
  @IsOptional()
  workflowAgentId: number;

  @IsNumber()
  @IsOptional()
  workflowTeamId: number;

  @IsArray()
  @IsNotEmpty()
  workflowChannels: {
    channelId: number;
    channelIdentifier: string;
  }[];
}
