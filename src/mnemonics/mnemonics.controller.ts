import { Controller, Get, HttpStatus, Res, Post, Body } from '@nestjs/common';
import e, { Request, Response } from 'express';
import { MnemonicsService } from './mnemonics.service';
import { CreatePrivateKeyDto } from './dto/CreatePrivateKey.dto';
import { CreatePublicKeyDto } from './dto/CreatePublicKey.dto';
import { BIP32Interface } from 'bip32';

@Controller('wallet')
export class MnemonicsController {
  constructor(public mnemonicsService: MnemonicsService) {}

  @Get('mnemonics')
  async getMnemonics(
    @Res() res: Response,
  ): Promise<e.Response<any, Record<string, any>>> {
    const mnemonics = this.mnemonicsService.createMnemonic();

    // return await this.mnemonicsService.generateMasterPrivateKey(mnemonics);
    return res.status(HttpStatus.OK).json({
      message: 'Mnemonics generated successfully',
      data: mnemonics,
    });
  }

  @Post('privatekey')
  async createMasterPrivateKey(
    @Body() createPrivateKeyDto: CreatePrivateKeyDto,
    @Res() res: Response,
  ): Promise<Response> {
    //check that the supplied mnemonic exist
    const privateKeyKey = await this.mnemonicsService.generateMasterPrivateKey(
      createPrivateKeyDto.mnemonic,
    );

    return res.status(HttpStatus.CREATED).json({
      message: 'x-public key generated successfully',
      data: privateKeyKey,
    });
  }

  @Post('publickey')
  async createPublicKey(
    @Body() createPublicKeyDto: CreatePublicKeyDto,
    @Res() res: Response,
  ): Promise<Response> {
    const publicKey = await this.mnemonicsService.deriveChildPublicKey(
      createPublicKeyDto.xpub,
    );
    return res.status(HttpStatus.CREATED).json({
      message: 'Child public key generated successfully',
      data: publicKey,
    });
  }
}
