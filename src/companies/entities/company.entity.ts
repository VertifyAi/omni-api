import { Entity, Column, PrimaryGeneratedColumn, OneToMany, ManyToMany, JoinTable, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Phone } from '../../phones/entities/phone.entity';
import { Area } from '../../areas/entities/area.entity';

@Entity({
  name: 'companies',
})
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  cnpj: string;

  @Column()
  phone_id: number;

  @Column()
  address_id: number;

  @OneToMany(() => Phone, phone => phone.company)
  whatsappNumbers: Phone[];

  @OneToMany(() => Area, area => area.company)
  areas: Area[];

  @ManyToMany(() => User)
  @JoinTable({
    name: 'company_users',
    joinColumn: {
      name: 'company_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'user_id',
      referencedColumnName: 'id',
    },
  })
  users: User[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
} 