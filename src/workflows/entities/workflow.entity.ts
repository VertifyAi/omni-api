import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { WorkflowsChannels } from './workflows-channels.entity';
import { WorkflowsAgents } from './workflows-agents.entity';
import { WorkflowsUsers } from './workflows-users.entity';
import { WorkflowsTeams } from './workflows-teams.entity';

@Entity('workflows')
export class Workflow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({ name: 'company_id' })
  companyId: number;

  @OneToMany(() => WorkflowsChannels, workflowChannel => workflowChannel.workflowId)
  workflowChannels: WorkflowsChannels[];

  @OneToMany(() => WorkflowsUsers, workflowUser => workflowUser.workflowId)
  workflowUsers: WorkflowsUsers[];

  @OneToMany(() => WorkflowsAgents, workflowAgent => workflowAgent.workflowId)
  workflowAgents: WorkflowsAgents[];

  @OneToMany(() => WorkflowsTeams, workflowTeam => workflowTeam.workflowId)
  workflowTeams: WorkflowsTeams[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
