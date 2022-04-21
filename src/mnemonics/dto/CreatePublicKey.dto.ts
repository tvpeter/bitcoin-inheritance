import { IsNotEmpty, IsString } from 'class-validator';
import { BIP32Interface } from 'bip32';

export class CreatePublicKeyDto {
  @IsNotEmpty()
  xpub: string;
}
