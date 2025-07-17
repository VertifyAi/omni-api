import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  DeleteDateColumn,
  Column,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Agent } from './agent.entity';

@Entity('agents_llm_knowledge_base')
export class AgentsllmKnowledgeBase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'file_url' })
  fileUrl: string;

  @Column({ name: 'agent_id' })
  agentId: number;

  @Column({ name: 'vector_store_id' })
  vectorStoreId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  @ManyToOne(() => Agent, (agent) => agent.llmKnowledgeBase)
  @JoinColumn({ name: 'agent_id' })
  agent: Agent;
}
