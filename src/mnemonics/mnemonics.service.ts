import { generateMnemonic, mnemonicToSeed } from 'bip39';
import { BIP32Interface, fromSeed } from 'bip32';
import * as varuint from 'bip174/src/lib/converter/varint';

import {
  payments,
  Psbt,
  bip32,
  networks,
  script,
  opcodes,
  crypto,
} from 'bitcoinjs-lib';
// import coinselect from 'coinselect';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { map, merge, mergeMap, switchMap, tap } from 'rxjs/operators';

@Injectable()
export class MnemonicsService {
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  async createMnemonic(): Promise<string> {
    //check if it exists
    try {
      let mnemonic = readFileSync(resolve('util', 'storage.txt'), 'utf8');

      if (mnemonic) {
        return mnemonic;
      }
      mnemonic = generateMnemonic(256);

      writeFileSync(resolve('util', 'storage.txt'), mnemonic);
      return mnemonic;
    } catch (error) {
      console.log(error);
    }
  }

  //generate a p2wsh

  async testFunction(heirPubKey): Promise<any> {
    const mnemonic = await this.createMnemonic();

    //master private key
    const masterPrivateKey = await this.getMasterPrivateKey(mnemonic);
    // const masterPrivateKeyFingerPrint = masterPrivateKey.fingerprint;

    //get xpub key
    const derivationPath = "m/84'/0'/0'";
    const xpub = this.getXpubFromPrivateKey(masterPrivateKey, derivationPath);
    //child public key
    const childDerivationPath = '0/1';
    const childPubKey = this.deriveChildPublicKey(xpub, childDerivationPath);

    //generate address
    const address = this.generateP2WSHAddress(childPubKey, heirPubKey);
    return address;
  }

  async getMasterPrivateKey(mnemonic: string): Promise<BIP32Interface> {
    const seed = await mnemonicToSeed(mnemonic);
    const privateKey = fromSeed(seed, networks.testnet);
    return privateKey;
  }

  getXpubFromPrivateKey(
    privateKey: BIP32Interface,
    derivationPath: string,
  ): string {
    const child = privateKey.derivePath(derivationPath).neutered();
    const xpub = child.toBase58();
    return xpub;
  }

  deriveChildPublicKey(xpub: string, derivationPath: string): BIP32Interface {
    const node = bip32.fromBase58(xpub, networks.testnet);
    const child = node.derivePath(derivationPath);
    return child;
  }

  getAddressFromChildPubkey(child: bip32.BIP32Interface): payments.Payment {
    const address = payments.p2wsh({
      pubkey: child.publicKey,
      network: networks.testnet,
    });

    return address;
  }

  generateP2WSHAddress(childKey, heirPubKey: string): payments.Payment {
    const witnessScript = this.generateScript(childKey, heirPubKey);
    console.log(witnessScript.toString('hex'));
    const address = payments.p2wsh({
      redeem: { output: witnessScript, network: networks.testnet },
      network: networks.testnet,
    });

    return address;
  }

  generateScript(childPubKey, heirPubKey) {
    return script.compile([
      opcodes.OP_PUSHBYTES_33,
      childPubKey,
      opcodes.OP_CHECKSIG,
      opcodes.OP_IFDUP,
      opcodes.OP_NOTIF,
      opcodes.OP_PUSHBYTES_33,
      heirPubKey,
      opcodes.OP_CHECKSIGVERIFY,
      opcodes.OP_PUSHBYTES_3,
      '9af040',
      opcodes.OP_CSV,
      opcodes.OP_ENDIF,
    ]);
  }

  // timeLockDuration = bip65.encode({
  //   utc: Math.floor(Date.now() / 1000) - 3600 * 6,
  // });

  //create and sign transaction
  async createTransasction(
    recipientAddress: string,
    amountInSatoshis: number,
    childPubKey,
    transaction_id: string,
    output_index: number,
    privateKey,
  ): Promise<Psbt> {
    // const feeRate = await getFeeRates();
    const bobAddress = 'bcrt1qev7gag9fevkmh2gc4zx5mp5th76meppddq20yn';
    const bobPubkey =
      '039413f1c2089625e32a5b4be3027939da5c0c5e7b15125512153b24093c356fb7';
    const bobPrivKey = 'cMhD6o7vpakenXFdtDoP91wQRBdEdGbkjYyL9RihYDBghuy4NBZr';

    const witnessScriptOutput = this.generateScript(childPubKey, bobPrivKey);

    const psbt = new Psbt({ network: networks.testnet });
    // psbt.setLocktime(this.timeLockDuration);

    psbt.addInput({
      hash: transaction_id,
      index: output_index,
      sequence: 0xfffffffe,
      nonWitnessUtxo: Buffer.from('TX_HEX', 'hex'),
      redeemScript: Buffer.from(witnessScriptOutput.toString(), 'hex'),
    });

    psbt.addOutput({
      address: recipientAddress,
      value: amountInSatoshis,
    });

    psbt.signInput(0, privateKey);
    // psbt.signInput(0, keyPairBob1);

    // Step 1: Check to make sure the meaningful locking script matches what you expect.
    const decompiled = script.decompile(witnessScriptOutput);
    if (!decompiled || decompiled[0] !== opcodes.OP_IF) {
      throw new Error(`Can not finalize input`);
    }

    const paymentFirstBranch = payments.p2wsh({
      redeem: {
        input: script.compile([privateKey.signature, opcodes.OP_TRUE]),
        output: witnessScriptOutput,
      },
    });

    const finalScriptWitness = this.witnessStackToScriptWitness(
      paymentFirstBranch.witness,
    );

    // psbt.finalizeInput(0, finalScriptWitness);

    return psbt;
  }

  witnessStackToScriptWitness(witness): Buffer {
    let buffer = Buffer.allocUnsafe(0);

    function writeSlice(slice: Buffer): void {
      buffer = Buffer.concat([buffer, Buffer.from(slice)]);
    }

    function writeVarInt(i: number): void {
      const currentLen = buffer.length;
      const varintLen = varuint.encodingLength(i);

      buffer = Buffer.concat([buffer, Buffer.allocUnsafe(varintLen)]);
      varuint.encode(i, buffer, currentLen);
    }

    function writeVarSlice(slice: Buffer): void {
      writeVarInt(slice.length);
      writeSlice(slice);
    }

    function writeVector(vector: Buffer[]): void {
      writeVarInt(vector.length);
      vector.forEach(writeVarSlice);
    }

    writeVector(witness);

    return buffer;
  }

  async getTransactionsOnAnAddress(address: string): Promise<Observable<any>> {
    const base_url = this.configService.get<string>(
      'BLOCKSTREAM_TEST_ENDPOINT',
    );

    const url = `${base_url}/address/${address}/txs`;
    // console.log(url);
    const resp = await lastValueFrom(
      this.httpService.get(url).pipe(map((resp) => resp.data)),
    );

    return resp;
  }

  async getUTXOfromAddress(address: string): Promise<Observable<any>> {
    const base_url = this.configService.get<string>(
      'BLOCKSTREAM_TEST_ENDPOINT',
    );

    const url = `${base_url}/address/${address}/utxo`;
    // console.log(url);
    const resp = await lastValueFrom(
      this.httpService.get(url).pipe(map((resp) => resp.data)),
    );

    return resp;
  }
}
