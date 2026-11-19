import { Equals, IsString, MaxLength, MinLength } from 'class-validator';

export class IssueGuestSessionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  device: string;

  @IsString()
  @MinLength(1)
  @MaxLength(256)
  fingerprint: string;

  @Equals('web')
  clientType: string;

  @Equals('client_gw')
  gateway: string;
}
