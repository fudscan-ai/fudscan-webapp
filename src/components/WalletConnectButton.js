import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useEffect, useState } from 'react';

export default function WalletConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="btn" disabled style={{ minWidth: '120px' }}>
        Loading...
      </button>
    );
  }

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleConnect = () => {
    // Find Coinbase Wallet connector
    const coinbaseConnector = connectors.find(
      (connector) => connector.id === 'coinbaseWalletSDK'
    );
    if (coinbaseConnector) {
      connect({ connector: coinbaseConnector });
    }
  };

  if (isConnected && address) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          className="standard-dialog"
          style={{
            padding: '4px 8px',
            fontSize: '10px',
            display: 'inline-block'
          }}
        >
          {formatAddress(address)}
        </div>
        <button
          className="btn"
          onClick={() => disconnect()}
          style={{ fontSize: '10px', padding: '4px 8px' }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      className="btn-default"
      onClick={handleConnect}
      style={{ fontSize: '10px', padding: '6px 12px' }}
    >
      Connect Wallet
    </button>
  );
}
