import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('workflows_channels')
export class WorkflowsChannels {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'workflow_id' })
  workflowId: number;

  @Column({ name: 'channel_id' })
  channelId: number;

  @Column({ name: 'channel_identifier' })
  channelIdentifier: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
