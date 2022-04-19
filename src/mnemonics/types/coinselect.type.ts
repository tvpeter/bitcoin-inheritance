declare module 'coinselect' {
  interface Output {
    address: string;
    value: number;
  }

  interface CoinSelectResponse<T> {
    inputs: T[];
    outputs: Output[];
    fee: number;
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  declare function coinselect<T>(
    utxos: T[],
    outputs: Output[],
    feeRate: number,
  ): CoinSelectResponse<T>;

  export default coinselect;
}
