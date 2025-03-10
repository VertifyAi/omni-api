import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Area } from '../../areas/entities/area.entity';

export enum UserRole {
  ADMIN = 'admin',
  ATTENDANT = 'attendant',
  SUPERVISOR = 'supervisor',
}

@Entity({
  name: 'users',
})
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  phone_id: number;

  @Column()
  address_id: number;

  @Column()
  area_id: number;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.ATTENDANT
  })
  role: UserRole;

  @ManyToOne(() => Area, area => area.users)
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;
}
