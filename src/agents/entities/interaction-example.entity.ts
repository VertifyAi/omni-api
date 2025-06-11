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

@Entity('interaction_examples')
export class InteractionExample {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  question: string;

  @Column()
  answer: string;

  @Column()
  reasoning: string;

  @Column({ name: 'agent_id' })
  agentId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  @ManyToOne(() => Agent, agent => agent.interactionExamples)
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;
}
