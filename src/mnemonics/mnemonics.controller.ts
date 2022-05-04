import {
  Controller,
  Get,
  HttpStatus,
  Res,
  Post,
  Body,
  ValidationPipe,
  UsePipes,
  Param,
  Query,
} from '@nestjs/common';
import e, { query, Request, Response } from 'express';
import { MnemonicsService } from './mnemonics.service';
import { CreatePrivateKeyDto } from './dto/CreatePrivateKey.dto';
import { CreatePublicKeyDto } from './dto/CreatePublicKey.dto';
import { CreateAddressDTO } from './dto/CreateAddress.dto';
import { createPublicKey } from 'crypto';
import { AddressTxsDTO } from './dto/GetAddressTxs.dto';
import { CreateTx } from './dto/CreateTx.dto';

@Controller('wallet')
export class MnemonicsController {
  constructor(public mnemonicsService: MnemonicsService) {}

  @Get('mnemonics')
  async getMnemonics(@Res() res: Response): Promise<Response> {
    const mnemonics = await this.mnemonicsService.createMnemonic();

    // return await this.mnemonicsService.generateMasterPrivateKey(mnemonics);
    return res.status(HttpStatus.OK).json({
      message: 'Mnemonics generated successfully',
      data: mnemonics,
    });
  }

  @Post('privatekey')
  @UsePipes(ValidationPipe)
  async createMasterPrivateKey(
    @Body() createPrivateKeyDto: CreatePrivateKeyDto,
    @Res() res: Response,
  ): Promise<Response> {
    const privateKeyKey = await this.mnemonicsService.getMasterPrivateKey(
      createPrivateKeyDto.mnemonic,
    );

    return res.status(HttpStatus.CREATED).json({
      message: 'x-public key generated successfully',
      data: privateKeyKey,
    });
  }

  @Post('test')
  async testAllFunctions(
    @Body() createPublicKey: CreatePublicKeyDto,
    @Res() res: Response,
  ) {
    const result = await this.mnemonicsService.testFunction(
      createPublicKey.xpub,
    );

    return res.json({
      data: result,
    });
  }

  @Get('address/txs')
  @UsePipes(ValidationPipe)
  public async getAddressTransactions(
    @Query() query,
    @Res() res: Response,
  ): Promise<e.Response<any, Record<string, any>>> {
    const tranxs = await this.mnemonicsService.getTransactionsOnAnAddress(
      query.address,
    );
    return res.status(HttpStatus.OK).json({
      message: 'Successfully retrieved address transacttions',
      data: tranxs,
    });
  }

  @Get('address/utxo')
  @UsePipes(ValidationPipe)
  public async getUTXOforAddress(
    @Query() query,
    @Res() res: Response,
  ): Promise<e.Response<any, Record<string, any>>> {
    const tranxs = await this.mnemonicsService.getUTXOfromAddress(
      query.address,
    );
    return res.status(HttpStatus.OK).json({
      message: 'Successfully retrieved utxo for given address',
      data: tranxs,
    });
  }

  //
  // @Post('xpubkey')
  // @UsePipes(ValidationPipe)
  // async createXpubkey(
  //   @Body() createPublicKeyDto: CreatePublicKeyDto,
  //   @Res() res: Response,
  // ): Promise<Response> {
  //   const xpublicKey = await this.mnemonicsService.getXpubFromPrivateKey(
  //     createPublicKeyDto.xpub,
  //   );
  //
  //   return res.status(HttpStatus.CREATED).json({
  //     message: 'x-public key generated successfully',
  //     data: xpublicKey,
  //   });
  // }

  // @Post('childpub')
  // async createChildPublicKey(
  //   @Body() createPublicKeyDto: CreatePublicKeyDto,
  //   @Res() res: Response,
  // ): Promise<Response> {
  //   const publicKey = await this.mnemonicsService.deriveChildPublicKey(
  //     createPublicKeyDto.xpub,
  //   );
  //   return res.status(HttpStatus.CREATED).json({
  //     message: 'Child public key generated successfully',
  //     data: publicKey,
  //   });
  // }

  @Post('trx')
  async createTransaction(
    @Body() createTX: CreateTx,
    @Res() res: Response,
  ): Promise<Response> {
    const psbt = await this.mnemonicsService.createTransaction();
    return res.status(HttpStatus.CREATED).json({
      message: 'Transaction created successfully',
      data: {
        txid: psbt,
      },
    });
  }

  @Post('address')
  async createAddress(
    @Body() createAddressDto: CreateAddressDTO,
    @Res() res: Response,
  ): Promise<Response> {
    const publicKey = this.mnemonicsService.getAddressFromChildPubkey(
      createAddressDto.childPub,
    );
    return res.status(HttpStatus.CREATED).json({
      message: 'address generated successfully',
      data: publicKey,
    });
  }
}
