/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTRACT_ADDRESS: string
  readonly VITE_HUB_ADDRESS: string
  readonly VITE_GROUP_CHAT_ADDRESS: string
  readonly VITE_INFURA_API_KEY: string
  readonly VITE_WALLETCONNECT_PROJECT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  ethereum?: any
}

// Declare module for Zama FHE SDK
declare module "https://cdn.zama.ai/relayer-sdk-js/0.2.0/relayer-sdk-js.js" {
  export function initSDK(): Promise<void>;
  export function createInstance(config: any): Promise<any>;
  export const SepoliaConfig: any;
}
