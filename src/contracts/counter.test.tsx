import { randomBytes } from 'crypto';
import { Counter } from './counter';
import { MethodCallOptions, DummyProvider, TestWallet, bsv } from 'scrypt-ts';
import artifact from "../../artifacts/counter.json";

describe('Test SmartContract `Counter`', () => {
    beforeAll(async () => {
        Counter.loadArtifact(artifact);
        await Counter.compile();
    });

    it('should pass the public method unit test successfully.', async () => {
        const balance = 1;

        const instance = new Counter(0n);
        const provider = new DummyProvider();
        const signer = new TestWallet(bsv.PrivateKey.fromRandom('testnet'), provider);
        await instance.connect(signer)

        // set current instance to be the deployed one
        let currentInstance = instance;

        // call the method of current instance to apply the updates on chain
        for (let i = 0; i < 3; ++i) {
            // create the next instance from the current
            const nextInstance = currentInstance.next();

            // apply updates on the next instance off chain
            nextInstance.count++;

            // call the method of current instance to apply the updates on chain
            const { tx: tx_i, atInputIndex } = await currentInstance.methods.increment({
                fromUTXO: {
                    txId: randomBytes(32).toString('hex'),
                    outputIndex: 0,
                    script: '', // placeholder
                    satoshis: balance,
                },
                next: {
                    instance: nextInstance,
                    balance,
                },
            } as MethodCallOptions<Counter>);

            const result = tx_i.verifyScript(atInputIndex);
            expect(result.success).toBe(true);

            // update the current instance reference
            currentInstance = nextInstance;
        }
    });
});