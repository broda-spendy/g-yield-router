import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { appChain, connectWallet, disconnectWallet, restoreWallet, subscribeWallet, switchNetwork as switchWalletNetwork, walletState } from "./goodbuild/wallet";

/**
 * The connected account, the wallet's name, connect and disconnect, and any connection error, plus the
 * network: chainId, networkName (this app's network), onRightNetwork, wrongNetwork and switchNetwork().
 * connect() shows the wallet list (browser wallets and, once published, phone wallets by QR code or
 * link) and moves the wallet to this app's network; inside MiniPay it connects on its own. The last
 * wallet used reconnects on the next visit.
 */
export function useWallet() {
  const state = useSyncExternalStore(subscribeWallet, walletState, walletState);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void restoreWallet();
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    try {
      await connectWallet();
    } catch (e) {
      // Closing the list or rejecting in the wallet isn't an error worth showing.
      if ((e as { code?: unknown }).code !== 4001) setError(e instanceof Error ? e.message : "Could not connect.");
    }
  }, []);

  const disconnect = useCallback(async () => {
    setError(null);
    await disconnectWallet();
  }, []);

  const switchNetwork = useCallback(async () => {
    setError(null);
    try {
      await switchWalletNetwork();
    } catch (e) {
      if ((e as { code?: unknown }).code !== 4001) setError(e instanceof Error ? e.message : "Could not switch network.");
    }
  }, []);

  const onRightNetwork = state.account !== null && state.chainId === appChain.id;
  const wrongNetwork = state.account !== null && state.chainId !== null && state.chainId !== appChain.id;
  return {
    account: state.account,
    walletName: state.wallet?.name ?? null,
    connect,
    disconnect,
    connecting: state.connecting,
    error,
    chainId: state.chainId,
    networkName: appChain.name,
    onRightNetwork,
    wrongNetwork,
    switchNetwork,
  };
}
