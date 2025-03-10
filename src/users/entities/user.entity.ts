import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, JoinColumn, OneToMany } from 'typeorm';
import { Phone } from '../../phones/entities/phone.entity';
import { Area } from '../../areas/entities/area.entity';
import { Company } from '../../companies/entities/company.entity';
import { UserRole } from '../user-role.enum';
import { Ticket } from '../../tickets/entities/ticket.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ name: 'area_id', nullable: true })
  area_id: number;

  @Column({ name: 'phone_id', nullable: true })
  phone_id: number;

  @ManyToOne('Area', 'users')
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @ManyToOne('Phone', 'users')
  @JoinColumn({ name: 'phone_id' })
  phone: Phone;

  @ManyToMany('Company', 'users')
  companies: Company[];

  @OneToMany('Ticket', 'user')
  tickets: Ticket[];

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER
  })
  role: UserRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
