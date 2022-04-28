import { generateMnemonic, mnemonicToSeed } from 'bip39';
import { BIP32Interface, fromSeed } from 'bip32';
import * as varuint from 'bip174/src/lib/converter/varint';
import { encode } from './types/bip68';
import {
  payments,
  Psbt,
  bip32,
  networks,
  script,
  opcodes,
  crypto,
  Payment,
  ECPair,
} from 'bitcoinjs-lib';
// import coinselect from a'coinselect';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, Observable } from 'rxjs';
import { AxiosResponse } from 'axios';
import { map, merge, mergeMap, switchMap, tap } from 'rxjs/operators';
import { KeyPair } from './types/mnemonics.types';
import { p2sh } from 'bitcoinjs-lib/types/payments';

@Injectable()
export class MnemonicsService {
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  // alice = ECPair.fromWIF(
  //   'cScfkGjbzzoeewVWmU2hYPUHeVGJRDdFt7WhmrVVGkxpmPP8BHWe',
  //   regtest,
  // );

  // bob = ECPair.fromWIF(
  //   'cMkopUXKWsEzAjfa1zApksGRwjVpJRB3831qM9W4gKZsLwjHXA9x',
  //   regtest,
  // );
  // console.log('Alice is using pubkey: ' + alice.publicKey.toString('hex'));
  // console.log('Bob is using pubkey:   ' + bob.publicKey.toString('hex'));

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
  //   const SEED = "amused news usage ill squeeze garlic buzz milk tank tonight smart cave camera upset float"
  // const BIP32_DERIVATION_PATH = "m/84'/1'/0'/0"

  // const ADDR1 = "bcrt1qhuut7wf7m9acg9ger4ce3pkhk8g5hskmknwldg"
  // const PUBKEY1 = "024c5e555945f6631a6098c00eb89c72767b2b50f120c98663f209f9ef206e23f9"
  // const PK1 = "cUAUHyKjLV8VuJCsxLoyRuc2gP859WPaceqcXfqVuAfHudpkcmmW"
  // const ADDR2 = "bcrt1q7dzdhap9g99nw82dv4qll4jshhr4m2f47umt4g"
  // const PUBKEY2 = "03f576f5febc937cb35f89014a691b99b6b040ef35a5909dd32a974a5c6704efc5"
  // const PK2 = "cN7WgpTFNcKncaYkecYrp4S9xXPiTzEwsqARKe5zR9sqWrMUDYev"

  async testFunction(heirPubKey): Promise<any> {
    const mnemonic = await this.createMnemonic();
    console.log('menomics: ' + mnemonic);

    // //master private key
    // const masterPrivateKey = await this.getMasterPrivateKey(mnemonic);
    // // const masterPrivateKeyFingerPrint = masterPrivateKey.fingerprint;
    // console.log('private key master: ' + masterPrivateKey.toWIF());
    // //get xpub key
    // const derivationPath = "m/84'/0'/0'";
    // const xpub = this.getXpubFromPrivateKey(masterPrivateKey, derivationPath);
    // //child public key
    // console.log('xpub key ' + xpub);

    // const childDerivationPath = '0/1';
    // const childPubKey = this.deriveChildPublicKey(xpub, childDerivationPath);
    // // return childPubKey;
    // console.log('public key ' + childPubKey);
    // //generate address

    const alice = ECPair.fromWIF(
      'cScfkGjbzzoeewVWmU2hYPUHeVGJRDdFt7WhmrVVGkxpmPP8BHWe',
      networks.testnet,
    );

    const bob = ECPair.fromWIF(
      'cMkopUXKWsEzAjfa1zApksGRwjVpJRB3831qM9W4gKZsLwjHXA9x',
      networks.testnet,
    );
    console.log('Alice is using pubkey: ' + alice.publicKey.toString('hex'));
    console.log('Bob is using pubkey:   ' + bob.publicKey.toString('hex'));
    console.log('Alice private key:   ' + alice.privateKey.toString('hex'));
    console.log('Bob private key key:   ' + bob.privateKey.toString('hex'));

    const address = this.generateP2WSHAddress(
      alice.publicKey.toString('hex'),
      bob.publicKey.toString('hex'),
    );
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

  generateP2WSHAddress(childKey, heirPubKey: string) {
    const witnessScript = this.redeemScript(childKey, heirPubKey);
    // console.log(witnessScript.toString('hex'));
    // const address = payments.p2wsh({
    //   redeem: { output: witnessScript, network: networks.testnet },
    //   network: networks.testnet,
    // });
    // const address = witnessScript.address;

    return witnessScript;
  }

  // generateScript(childPubKey, heirPubKey) {
  //   return script.compile([
  //     opcodes.OP_PUSHBYTES_33,
  //     childPubKey,
  //     opcodes.OP_CHECKSIG,
  //     opcodes.OP_IFDUP,
  //     opcodes.OP_NOTIF,
  //     opcodes.OP_PUSHBYTES_33,
  //     heirPubKey,
  //     opcodes.OP_CHECKSIGVERIFY,
  //     opcodes.OP_PUSHBYTES_3,
  //     '9af040',
  //     opcodes.OP_CSV,
  //     opcodes.OP_ENDIF,
  //   ]);
  // }

  // timeLockDuration = bip65.encode({
  //   utc: Math.floor(Date.now() / 1000) - 3600 * 6,
  // });

  //create and sign transaction
  async createTransaction(
    recipientAddress: string,
    amountInSatoshis: number,
    transaction_id: string,
    alicePubKey: string,
    heirPubKey: string,
    privateKey: string,
  ): Promise<any> {
    const sequence = encode({ seconds: 7168 });
    const base_url = this.configService.get<string>(
      'BLOCKSTREAM_TEST_ENDPOINT',
    );

    const addr = 'tb1qjah7lr0zu9e6y0gu52dkc6mrxh5wev3qwnkcnf';
    // menomics: offer demand swallow lizard taste connect media cool flame mail pistol resource rebel assault panther shove wink planet flip notable reduce blanket horror aspect
    //Alice is using pubkey: 038ea27103fb646a2cea9eca9080737e0b23640caaaef2853416c9b286b353313e
    //Bob is using pubkey:   038f0248cc0bebc425eb55af1689a59f88119c69430a860c6a05f340e445c417d7
    //Alice private key:   9632f11629d05bbb9a3aef95d330b3fab6630d8133bed3efe0cc8b19191c53a9
    //Bob private key key:   0532f8eee64d878e051cb2a330428f193c6650da12a03f302c8eac826388a9a1
    //p2wsh address : tb1qtlfn8sh32asacx6kcvxr5wmsmqf7vzvul8s83cadw2h3rh8dxmqshzyr0j
    //txid = 76901d499b6746cb51c12210eeb813ea4159b19c65bc09485fdf36db029f77e6
    const txid =
      '76901d499b6746cb51c12210eeb813ea4159b19c65bc09485fdf36db029f77e6';
    const url = `${base_url}/tx/${txid}`;
    const tx = await lastValueFrom(
      this.httpService.get(url).pipe(map((resp) => resp.data)),
    );

    const nonWitnessUtxo = Buffer.from(tx.vout, 'hex');
    console.log(nonWitnessUtxo);
    // const alice = ECPair.fromWIF(privateKey, networks.testnet);
    const alice = ECPair.fromWIF(
      'cScfkGjbzzoeewVWmU2hYPUHeVGJRDdFt7WhmrVVGkxpmPP8BHWe',
      networks.testnet,
    );

    const bob = ECPair.fromWIF(
      'cMkopUXKWsEzAjfa1zApksGRwjVpJRB3831qM9W4gKZsLwjHXA9x',
      networks.testnet,
    );

    const witnessScript = this.redeemScript(
      alice.publicKey.toString('hex'),
      bob.publicKey.toString('hex'),
    );

    const psbt = new Psbt({ network: networks.testnet })
      .setVersion(2)
      .addInput({
        hash: txid,
        index: 0,
        sequence,
        redeemScript: witnessScript.redeem.output,
        nonWitnessUtxo,
      })
      .addOutput({
        address: addr,
        value: 2000,
      })
      .signInput(0, alice)
      .finalizeInput(0, this.csvGetFinalScripts)
      .extractTransaction();
    console.log('Created transaction: ' + psbt.toHex());
    console.log('Transaction has ID: ' + psbt.getId());

    return psbt;
  }

  createRefreshOutputScript(aliceKey, bobKey: KeyPair): Buffer {
    const sequence = encode({ seconds: 7168 });

    return script.fromASM(
      `
      ${aliceKey.toString('hex')}
      OP_CHECKSIG
      OP_IFDUP
      OP_NOTIF
          ${bobKey}
          OP_CHECKSIGVERIFY
          ${script.number.encode(sequence).toString('hex')}
          OP_CHECKSEQUENCEVERIFY
      OP_ENDIF
    `
        .trim()
        .replace(/\s+/g, ' '),
    );
  }

  redeemScript(alice, bob) {
    const redeemScript = payments.p2wsh({
      redeem: {
        output: this.createRefreshOutputScript(alice, bob),
      },
      network: networks.testnet,
    });

    return redeemScript;
  }

  async signTransaction(psbt: Psbt, pubkey, witnessScriptOutput) {
    // Step 1: Check to make sure the meaningful locking script matches what you expect.
    // const decompiled = script.decompile(witnessScriptOutput);
    // if (!decompiled || decompiled[0] !== opcodes.OP_IF) {
    //   throw new Error(`Can not finalize input`);
    // }

    const paymentFirstBranch = payments.p2wsh({
      redeem: {
        input: script.compile([pubkey.signature, opcodes.OP_TRUE]),
        output: witnessScriptOutput,
      },
    });

    const finalScriptWitness = this.witnessStackToScriptWitness(
      paymentFirstBranch.witness,
    );
    const mnemonic = await this.createMnemonic();
    const seed = await mnemonicToSeed(mnemonic);
    const root = bip32.fromSeed(seed, networks.testnet);

    // const keyPair = pub and network
    //ecpair
    // psbt.signInput(0, pubkey);

    // psbt.signInput(0, pubkey);
    psbt.signInputHD(0, root);

    psbt.finalizeAllInputs();
  }

  //refresh transaction
  //mnenomic of alice, pubkey of bob, this should be saved
  //use fix derivationpath
  //abstract the fn that keeps count of the derivation path prob an in-memory db
  //

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

  // This function is used to finalize a CSV transaction using PSBT.
  // See first test above.
  csvGetFinalScripts(
    inputIndex: number,
    input,
    scriptHash: Buffer,
    isSegwit: boolean,
    isP2SH: boolean,
    isP2WSH: boolean,
  ): {
    finalScriptSig: Buffer | undefined;
    finalScriptWitness: Buffer | undefined;
  } {
    // Step 1: Check to make sure the meaningful script matches what you expect.
    const decompiled = script.decompile(scriptHash);
    // Checking if first OP is OP_IF... should do better check in production!
    // You may even want to check the public keys in the script against a
    // whitelist depending on the circumstances!!!
    // You also want to check the contents of the input to see if you have enough
    // info to actually construct the scriptSig and Witnesses.
    if (!decompiled || decompiled[0] !== opcodes.OP_IF) {
      throw new Error(`Can not finalize input #${inputIndex}`);
    }

    // Step 2: Create final scripts
    let payment: Payment = {
      network: networks.testnet,
      output: scriptHash,
      // This logic should be more strict and make sure the pubkeys in the
      // meaningful script are the ones signing in the PSBT etc.
      input: script.compile([input.partialSig[0].signature, opcodes.OP_TRUE]),
    };
    if (isP2WSH && isSegwit)
      payment = payments.p2wsh({
        network: networks.testnet,
        redeem: payment,
      });
    if (isP2SH)
      payment = payments.p2wsh({
        network: networks.testnet,
        redeem: payment,
      });

    function witnessStackToScriptWitness(witness: Buffer[]): Buffer {
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

    return {
      finalScriptSig: payment.input,
      finalScriptWitness:
        payment.witness && payment.witness.length > 0
          ? witnessStackToScriptWitness(payment.witness)
          : undefined,
    };
  }
}
