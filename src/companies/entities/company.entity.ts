import { Integration } from 'src/integrations/entities/integration.entity';
import { Ticket } from 'src/tickets/entities/ticket.entity';
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
import { Team } from 'src/teams/entities/teams.entity';
import { User } from 'src/users/entities/user.entity';
import { Subscription } from 'src/billing/entities/subscription.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ name: 'street_name' })
  streetName: string;

  @Column({ name: 'street_number' })
  streetNumber: string;

  @Column()
  city: string;

  @Column()
  state: string;

  @Column()
  phone: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  @OneToMany(() => Ticket, (ticket) => ticket.company)
  ticket: Ticket[];

  @OneToMany(() => Integration, (integration) => integration.company)
  integration: Integration[];

  @OneToMany(() => Team, (team) => team.company)
  teams: Team[];

  @OneToMany(() => User, (user) => user.company)
  users: User[];

  @OneToOne(() => Subscription, (subscription) => subscription.company)
  subscription: Subscription;
}
