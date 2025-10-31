import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function CompactConnectButton() {
  return (
    <div className="compact-connect-button flex items-center">
      <ConnectButton 
        showBalance={false}
        chainStatus="icon"
        accountStatus={{
          smallScreen: 'avatar',
          largeScreen: 'full',
        }}
      />
      <style>{`
        .compact-connect-button {
          display: flex;
          align-items: center;
        }
        
        .compact-connect-button button {
          height: 32px !important;
          padding: 0 10px !important;
          font-size: 13px !important;
          display: flex !important;
          align-items: center !important;
          line-height: 1 !important;
        }
        
        .compact-connect-button button span {
          line-height: 1 !important;
        }
        
        .compact-connect-button > div {
          display: flex;
          align-items: center;
        }
        
        @media (min-width: 640px) {
          .compact-connect-button button {
            height: 40px !important;
            padding: 0 16px !important;
            font-size: 15px !important;
          }
        }
      `}</style>
    </div>
  );
}
