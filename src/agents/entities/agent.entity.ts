import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Ticket } from 'src/tickets/entities/ticket.entity';
import { InteractionExample } from './interaction-example.entity';
import { TeamsToRedirect } from './teams-to-redirect.entity';
import { Workflow } from 'src/workflows/entities/workflow.entity';

export enum AgentObjective {
  SCREENING = 'screening',
  SALES = 'sales',
  SUPPORT = 'support',
}

export enum AgentTone {
  CASUAL = 'casual',
  FORMAL = 'formal',
  INFORMAL = 'informal',
}

export enum AgentSegment {
  TECHNOLOGY = 'technology',
  FINANCE = 'finance',
  HEALTH = 'health',
  EDUCATION = 'education',
  OTHER = 'other',
}

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  tone: AgentTone;

  @Column()
  objective: AgentObjective;

  @Column()
  segment: AgentSegment;

  @Column()
  description: string;

  @Column({ name: 'presentation_example' })
  presentationExample: string;

  @Column({ name: 'llm_assistant_id' })
  llmAssistantId: string;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'workflow_id' })
  workflowId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  @OneToMany(() => Ticket, (ticket) => ticket.agent)
  tickets: Ticket[];

  @OneToMany(() => TeamsToRedirect, (team) => team.agentId)
  teamsToRedirect: TeamsToRedirect[];

  @OneToMany(() => InteractionExample, (interaction) => interaction.agentId)
  interactionExamples: InteractionExample[];

  @OneToOne(() => Workflow, (workflow) => workflow.workflowAgent)
  @JoinColumn({ name: 'workflow_id' })
  workflow: Workflow;
}
