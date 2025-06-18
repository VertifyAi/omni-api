import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { Team } from 'src/teams/entities/teams.entity';
import { Exclude } from 'class-transformer';
import { Company } from 'src/companies/entities/company.entity';
import { Workflow } from 'src/workflows/entities/workflow.entity';
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  email: string;

  @Exclude()
  @Column()
  password: string;

  @Column()
  role: UserRole;

  @Column({ name: 'street_name'})
  streetName: string;

  @Column({ name: 'street_number'})
  streetNumber: string;

  @Column()
  city: string;

  @Column()
  state: string;

  @Column()
  phone: string;

  @Column({ name: 'area_id' })
  areaId: number;

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

  @OneToMany(() => Team, (team) => team.owner)
  ownedTeams: Team[];

  @ManyToMany(() => Team, (team) => team.members)
  @JoinTable()
  teams: Team[];

  @ManyToOne(() => Company, (company) => company.users)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToOne(() => Workflow, (workflow) => workflow.workflowUser)
  @JoinColumn({ name: 'workflow_id' })
  workflow: Workflow;
}
