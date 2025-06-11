import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
  } from 'typeorm';
  
  @Entity('workflows_agents')
  export class WorkflowsAgents {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column({ name: 'workflow_id' })
    workflowId: number;
  
    @Column({ name: 'agent_id' })
    agentId: number;
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  
    @DeleteDateColumn({ name: 'deleted_at' })
    deletedAt: Date;
  }
  