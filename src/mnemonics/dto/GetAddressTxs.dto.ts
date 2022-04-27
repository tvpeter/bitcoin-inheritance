import { IsNotEmpty, IsString } from 'class-validator';

export class AddressTxsDTO {
  @IsNotEmpty()
  @IsString()
  address: string;
}
