import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, JoinTable } from 'typeorm';
import { Phone } from '../../phones/entities/phone.entity';
import { User } from '../../users/entities/user.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  cnpj: string;

  @OneToMany(() => Phone, phone => phone.company)
  phones: Phone[];

  @ManyToMany(() => User, user => user.companies)
  @JoinTable({
    name: 'company_users',
    joinColumn: { name: 'company_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' }
  })
  users: User[];

  @OneToMany(() => Ticket, ticket => ticket.company)
  tickets: Ticket[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
} 