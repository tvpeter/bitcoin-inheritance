import { generateMnemonic, mnemonicToSeed } from 'bip39';
import { BIP32Interface, fromSeed } from 'bip32';
import {
  payments,
  Psbt,
  bip32,
  networks,
  script,
  opcodes,
} from 'bitcoinjs-lib';
// import coinselect from 'coinselect';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

@Injectable()
export class MnemonicsService {
  constructor(private configService: ConfigService) {}

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
}
