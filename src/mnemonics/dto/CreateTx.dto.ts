import { IsNotEmpty, IsString } from 'class-validator';
import { bip32 } from 'bitcoinjs-lib';

export class CreateTx {
  @IsNotEmpty()
  @IsString()
  recipientAddress: string;

  @IsNotEmpty()
  amount: number;

  @IsNotEmpty()
  transaction_id: string;

  @IsNotEmpty()
  pubkey: string;

  @IsNotEmpty()
  heirPubKey: string;

  @IsNotEmpty()
  privateKey: string;
}
