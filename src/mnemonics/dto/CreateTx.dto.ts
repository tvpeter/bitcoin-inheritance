import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateTx {
  @IsNotEmpty()
  @IsString()
  transaction_id: string;

  @IsNotEmpty()
  @IsNumber()
  output_index: number;

  @IsNotEmpty()
  recipientAddress: string;

  @IsNotEmpty()
  amountInSatoshis: number;
}
