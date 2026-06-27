import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';

import { SessionModel } from '../session/session.model';

@Entity('refresh_token')
export class RefreshTokenModel {
  @PrimaryColumn('uuid', { name: 'uuid', default: () => 'gen_random_uuid()' })
  uuid: string;

  @Column({ name: 'token', type: 'varchar', length: 256 })
  token: string;

  @Column({ name: 'session_uuid', type: 'uuid' })
  sessionUuid: string;

  @JoinColumn({ name: 'session_uuid' })
  @OneToOne(() => SessionModel, (session) => session.refreshToken, { cascade: true, onDelete: 'CASCADE' })
  session: SessionModel;

  @Column({ name: 'is_revoked', type: 'boolean' })
  isRevoked: boolean;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

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
