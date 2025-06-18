import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { WorkflowsChannels } from './workflows-channels.entity';
import { Agent } from 'src/agents/entities/agent.entity';
import { User } from 'src/users/entities/user.entity';
import { Team } from 'src/teams/entities/teams.entity';

@Entity('workflows')
export class Workflow {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({ type: 'json', nullable: true, name: 'flow_data' })
  flowData: object;

  @Column({ name: 'company_id' })
  companyId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  @OneToMany(
    () => WorkflowsChannels,
    (workflowChannel) => workflowChannel.workflow,
  )
  workflowChannels: WorkflowsChannels[];

  @OneToOne(() => User, (workflowUser) => workflowUser.workflow)
  workflowUser: User;

  @OneToOne(() => Agent, (workflowAgent) => workflowAgent.workflow)
  workflowAgent: Agent;

  @OneToOne(() => Team, (workflowTeam) => workflowTeam.workflow)
  workflowTeam: Team;
}
