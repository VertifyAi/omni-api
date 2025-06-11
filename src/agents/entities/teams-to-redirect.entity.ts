import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Agent } from './agent.entity';

@Entity('teams_to_redirect')
export class TeamsToRedirect {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'team_id' })
  teamId: number;

  @Column({ name: 'agent_id' })
  agentId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  @ManyToOne(() => Agent, agent => agent.teamsToRedirect)
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;
}
