import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({
  name: 'addresses',
})
export class Address {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  street: string;

  @Column()
  city: string;

  @Column()
  state: string;

  @Column()
  zip_code: string;

  @Column()
  country: string;

  @Column()
  complement: string;
}
