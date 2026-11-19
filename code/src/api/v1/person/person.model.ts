import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';

import { UserModel } from '../user/user.model';

export enum SexEnum {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

@Entity('person')
export class PersonModel {
  @PrimaryColumn('uuid', { name: 'uuid', default: () => 'gen_random_uuid()' })
  uuid: string;

  @Column({ name: 'name', type: 'varchar', length: 256 })
  name: string;

  @Column({ name: 'surname', type: 'varchar', length: 256 })
  surname: string;

  @Column({ name: 'patronymic', type: 'varchar', length: 256 })
  patronymic: string;

  @Column({ name: 'birthday', type: 'timestamp' })
  birthday: Date;

  @Column({ type: 'enum', enum: SexEnum, nullable: true })
  sex?: SexEnum;

  @Column({ name: 'user_uuid', type: 'uuid' })
  userUuid: string;

  @JoinColumn({ name: 'user_uuid' })
  @OneToOne(() => UserModel, (user) => user.uuid, { cascade: true, onDelete: 'CASCADE' })
  user: UserModel;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
