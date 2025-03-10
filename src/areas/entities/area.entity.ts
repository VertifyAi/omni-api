import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({
  name: 'areas',
})
export class Area {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'company_id' })
  company_id: number;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
} 