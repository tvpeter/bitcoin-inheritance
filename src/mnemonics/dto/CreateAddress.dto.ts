import { IsNotEmpty, IsString } from 'class-validator';
import { bip32 } from 'bitcoinjs-lib';

export class CreateAddressDTO {
  @IsNotEmpty()
  @IsString()
  childPub: bip32.BIP32Interface;
}
