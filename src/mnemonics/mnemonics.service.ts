import { Injectable } from '@nestjs/common';
import { generateMnemonic, mnemonicToSeed } from 'bip39';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { BIP32Interface, fromSeed } from 'bip32';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { networks, bip32, payments, Psbt } from 'bitcoinjs-lib';
import { DecoratedUtxo, Address } from './mnemonics.types';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import coinselect from './coinselect.type';

@Injectable()
export class MnemonicsService {
  constructor(private configService: ConfigService) {}

  createMnemonic(): string {
    //check if it exists
    let mnemonic: string = this.configService.get<string>('MNEMONIC');

    if (mnemonic) {
      return mnemonic;
    }
    mnemonic = generateMnemonic(256);
    process.env.MNEMONIC = mnemonic;
    return mnemonic;
  }

  async generateMasterPrivateKey(mnemonic: string): Promise<string> {
    const seed = await mnemonicToSeed(mnemonic);
    const privateKey = fromSeed(seed, networks.testnet);

    const derivationPath = "m/84'/0'/0'"; // P2WPKH
    const child = privateKey.derivePath(derivationPath).neutered();
    return child.toBase58();
    // return privateKey;
  }

  // async getXpubFromPrivateKey(privateKey: BIP32Interface): Promise<string> {
  //   //because it is a multi-sig 2 of 2
  //   const derivationPath = "m/84'/0'/0'"; // P2WPKH
  //   const child = privateKey.derivePath(derivationPath).neutered();
  //   return child.toBase58();
  // }

  async deriveChildPublicKey(xpublickey: string): Promise<BIP32Interface> {
    const derivationPath = "m/84'/0'/0'";
    const node = bip32.fromBase58(xpublickey, networks.testnet);
    const publicKey = node.derivePath(derivationPath);
    return publicKey;
  }

  getAddressFromPublicKey(child: bip32.BIP32Interface): payments.Payment {
    return payments.p2wpkh({
      pubkey: child.publicKey,
      network: networks.testnet,
    });
  }
  createTransasction(
    utxos: DecoratedUtxo[],
    recipientAddress: string,
    amountInSatoshis: number,
    changeAddress: Address,
  ): Psbt {
    // const feeRate = await getFeeRates();

    const { inputs, outputs, fee } = coinselect(
      utxos,
      [
        {
          address: recipientAddress,
          value: amountInSatoshis,
        },
      ],
      4,
    );

    if (!inputs || !outputs) throw new Error('Unable to construct transaction');
    if (fee > amountInSatoshis) throw new Error('Fee is too high!');

    const psbt = new Psbt({ network: networks.testnet });
    psbt.setVersion(2);
    psbt.setLocktime(0);

    inputs.forEach((input) => {
      psbt.addInput({
        hash: input.txid,
        index: input.vout,
        sequence: 0xfffffffd, // enables RBF
        witnessUtxo: {
          value: input.value,
          script: input.address.output!,
        },
        bip32Derivation: input.bip32Derivation,
      });
    });

    outputs.forEach((output) => {
      // coinselect doesnt apply address to change output, so add it here
      if (!output.address) {
        output.address = changeAddress.address!;
      }

      psbt.addOutput({
        address: output.address,
        value: output.value,
      });
    });

    return psbt;
  }
}
