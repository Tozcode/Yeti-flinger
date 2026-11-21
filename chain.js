// Connects the game to the Yeti Flinger contract on Sui testnet.
// The page calls window.YetiChain; it is loaded as a module so the Sui kit gets bundled.
import { createDAppKit } from '@mysten/dapp-kit-core';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Transaction } from '@mysten/sui/transactions';

const PACKAGE_ID = '0x713a61b8e52c69b4a072976298c4e492155c010c35b7fd0a06e1328d9a65d1bb';
const BOARD_ID = '0x8c555e60ff6ce860328c3b7ad79d6b6a0ebe2c7dd2d685979a0942cbdaa9be39';
const NETWORK = 'testnet';
const URLS = { testnet: 'https://fullnode.testnet.sui.io:443' };

const dAppKit = createDAppKit({
  networks: [NETWORK],
  createClient: (network) => new SuiGrpcClient({ network, baseUrl: URLS[network] }),
});

async function run(tx) {
  const res = await dAppKit.signAndExecuteTransaction({ transaction: tx });
  if (res.$kind === 'FailedTransaction') {
    const err = res.FailedTransaction.status && res.FailedTransaction.status.error;
    throw new Error((err && err.message) || 'Transaction failed');
  }
  return res.Transaction.digest;
}

window.YetiChain = {
  configured: true,
  network: NETWORK,
  wallets: () => dAppKit.stores.$wallets.get(),
  connect: (wallet) => dAppKit.connectWallet({ wallet }),
  disconnect: () => dAppKit.disconnectWallet(),
  address() {
    const c = dAppKit.stores.$connection.get();
    return c && c.isConnected ? c.account.address : null;
  },
  onChange(cb) {
    const a = dAppKit.stores.$connection.subscribe(cb);
    const b = dAppKit.stores.$wallets.subscribe(cb);
    return () => { a(); b(); };
  },
  submitScore(name, score) {
    const tx = new Transaction();
    tx.moveCall({
      target: PACKAGE_ID + '::leaderboard::submit',
      arguments: [tx.object(BOARD_ID), tx.pure.string(name), tx.pure.u64(score)],
    });
    return run(tx);
  },
  mintHat(name, tier) {
    const tx = new Transaction();
    tx.moveCall({
      target: PACKAGE_ID + '::leaderboard::mint_hat',
      arguments: [tx.pure.string(name), tx.pure.u8(tier)],
    });
    return run(tx);
  },
  // Reads the shared board with a plain JSON-RPC call. Returns null if the node refuses it.
  async loadBoard() {
    try {
      const r = await fetch(URLS[NETWORK], {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1, method: 'sui_getObject',
          params: [BOARD_ID, { showContent: true }],
        }),
      });
      const j = await r.json();
      const list = j.result.data.content.fields.entries || [];
      return list.map((e) => {
        const f = e.fields || e;
        return { name: String(f.name), score: Number(f.score), player: f.player };
      });
    } catch (e) {
      return null;
    }
  },
};
window.dispatchEvent(new Event('yeti-chain-ready'));
