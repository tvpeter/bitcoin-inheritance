import {
  Controller,
  Get,
  HttpStatus,
  Res,
  Req,
  Post,
  Header,
  Body,
} from '@nestjs/common';
import { MnemonicsService } from './mnemonics.service';

@Controller('mnemonics')
export class MnemonicsController {
  constructor(public mnemonicsService: MnemonicsService) {}

  @Get()
  getMnemonics(@Res() res): string {
    const mnemonics = this.mnemonicsService.createMnemonic();

    return res.status(HttpStatus.OK).json({
      message: 'Mnemonics generated successfully',
      data: mnemonics,
    });
  }

  @Post()
  async createMasterPrivateKey(@Body() body, @Res() res): Promise<string> {
    //check that the supplied mnemonic exist
    const privateKeyKey = await this.mnemonicsService.generateMasterPrivateKey(
      body.mnemonic,
    );

    return res.status(HttpStatus.CREATED).json({
      message: 'Private key generated successfully',
      data: privateKeyKey,
    });
  }
}
