import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePrivateKeyDto {
  @IsString()
  @IsNotEmpty()
  mnemonic: string;
}
