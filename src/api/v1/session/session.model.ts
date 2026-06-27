import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

import { UserModel } from '../user/user.model';

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

  @Column({ name: 'fingerprint_hash', type: 'varchar', length: 128 })
  fingerprintHash: string;

  @Column({ name: 'secret_hash', type: 'varchar', length: 128 })
  secretHash: string;

  @Column({ name: 'client_type', type: 'varchar', length: 32, default: 'web' })
  clientType: string;

  @Column({ name: 'gateway', type: 'varchar', length: 64, default: 'admin_gw' })
  gateway: string;

  @Column({ name: 'auth_method', type: 'varchar', length: 64, default: 'password' })
  authMethod: string;

  @Column({ name: 'assurance_level', type: 'varchar', length: 32, default: 'medium' })
  assuranceLevel: string;

  @Column({ name: 'status', type: 'varchar', length: 32, default: 'active' })
  status: string;

  @Column({ name: 'is_revoked', type: 'boolean', default: false })
  isRevoked: boolean;

  @Column({ name: 'renew_required_at', type: 'timestamp' })
  renewRequiredAt: Date;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
  revokedAt?: Date;

  @Column({ name: 'revoke_reason', type: 'varchar', length: 128, nullable: true })
  revokeReason?: string;

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
