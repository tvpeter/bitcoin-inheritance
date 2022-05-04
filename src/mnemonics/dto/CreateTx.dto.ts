import { IsNotEmpty, IsString } from 'class-validator';
import { bip32 } from 'bitcoinjs-lib';

export class CreateTx {
  @IsNotEmpty()
  @IsString()
  recipientAddress: string;
}
