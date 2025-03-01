import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

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
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column()
  phoneId: number;

  @Column()
  addressId: number;

  @Column()
  areaId: number;

  @Column()
  role: UserRole;
}
