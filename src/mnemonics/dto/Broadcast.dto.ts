import { IsNotEmpty, IsString } from 'class-validator';

export class BroadcastDto {
  @IsNotEmpty()
  @IsString()
  txHex: string;
}
