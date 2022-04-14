import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
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
}
