import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Phone } from '../../phones/entities/phone.entity';
import { User } from '../../users/entities/user.entity';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { Area } from '../../areas/entities/area.entity';
import { Address } from '../../addresses/entities/address.entity';
import { Integration } from '../../integrations/entities/integration.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ name: 'tax_id', unique: true })
  taxId: string;

  @ManyToOne(() => Address)
  @JoinColumn({ name: 'address_id' })
  address: Address;

  @OneToMany(() => Phone, phone => phone.company)
  phones: Phone[];

  @OneToMany(() => User, user => user.company)
  users: User[];

  @OneToMany(() => Area, area => area.company)
  areas: Area[];

  @OneToMany(() => Ticket, ticket => ticket.company)
  tickets: Ticket[];

  @OneToMany(() => Integration, integration => integration.company)
  integrations: Integration[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
} 