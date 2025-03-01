import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({
  name: 'phones',
})
export class Phone {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 3 })
  countryCode: string;

  @Column({ length: 2 })
  stateCode: string;

  @Column()
  number: string;
}
