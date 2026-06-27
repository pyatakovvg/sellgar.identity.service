import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';

import { UserModel } from '../user/user.model';
import { RefreshTokenModel } from '../refresh-token/refresh-token.model';

@Entity('session')
export class SessionModel {
  @PrimaryColumn('uuid', { name: 'uuid', default: () => 'gen_random_uuid()' })
  uuid: string;

  @Column({ name: 'user_uuid' })
  userUuid: string;

  @JoinColumn({ name: 'user_uuid' })
  @ManyToOne(() => UserModel, (user) => user.uuid, { cascade: true, onDelete: 'CASCADE' })
  user: UserModel;

  @Column({ name: 'device', type: 'varchar', length: 256 })
  device: string;

  @Column({ name: 'fingerprint', type: 'varchar', length: 256 })
  fingerprint: string;

  @Column({ name: 'is_revoked', type: 'boolean', default: false })
  isRevoked: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @OneToOne(() => RefreshTokenModel, (refreshToken) => refreshToken.session)
  refreshToken: RefreshTokenModel;
}
