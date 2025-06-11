import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    DeleteDateColumn,
  } from 'typeorm';
  
  @Entity('workflows_teams')
  export class WorkflowsTeams {
    @PrimaryGeneratedColumn()
    id: number;
  
    @Column({ name: 'workflow_id' })
    workflowId: number;
  
    @Column({ name: 'team_id' })
    teamId: number;
  
    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
  
    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
  
    @DeleteDateColumn({ name: 'deleted_at' })
    deletedAt: Date;
  }
  