import { Company } from 'src/companies/entities/company.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Workflow } from 'src/workflows/entities/workflow.entity';
import { Ticket } from 'src/tickets/entities/ticket.entity';

@Entity('areas')
export class Team {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  @Column({ name: 'company_id' })
  companyId: number;

  @Column({ name: 'owner_id' })
  ownerId: number;

  @Column({ name: 'workflow_id' })
  workflowId: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  @ManyToOne(() => Company, (company) => company.teams)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => User, (user) => user.ownedTeams)
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @ManyToMany(() => User, (user) => user.teams)
  @JoinTable()
  members: User[];

  @OneToOne(() => Workflow, (workflow) => workflow.workflowTeam)
  @JoinColumn({ name: 'workflow_id' })
  workflow: Workflow;

  @OneToMany(() => Ticket, (ticket) => ticket.area)
  tickets: Ticket[];
}
