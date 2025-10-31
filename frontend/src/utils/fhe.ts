// SPDX-License-Identifier: BSD-3-Clause-Clear
import {
  initSDK,
  createInstance,
  SepoliaConfig
} from "https://cdn.zama.ai/relayer-sdk-js/0.2.0/relayer-sdk-js.js";
import { ethers } from "ethers";

let fheInstance: any = null;
let initPromise: Promise<any> | null = null;

/* ----------------------------------------------------------
   🔧 Utility Functions
---------------------------------------------------------- */
function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function bytesToHex(bytes: Uint8Array): string {
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
  }
  return bytes;
}

/* ----------------------------------------------------------
   ⚙️ Initialize Zama FHE SDK (Testnet)
---------------------------------------------------------- */
export async function initializeFHE() {
  // Return existing instance
  if (fheInstance) return fheInstance;
  
  // Return existing initialization promise to prevent concurrent inits
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log("🔐 Initializing Zama FHE SDK...");
      await initSDK();

      const config = {
        ...SepoliaConfig,
        relayerUrl: "https://relayer.testnet.zama.cloud",
        network: window.ethereum
      };

      console.log("🔧 Using FHE config:", config);

      fheInstance = await createInstance(config);
      console.log("✅ Zama FHE initialized successfully");
      return fheInstance;
    } catch (error) {
      console.error("❌ FHE initialization failed:", error);
      initPromise = null; // Reset promise on failure to allow retry
      throw new Error("FHE SDK initialization failed. Please check browser compatibility.");
    }
  })();

  return initPromise;
}

/* ----------------------------------------------------------
   🔒 Encrypt and Store Message
---------------------------------------------------------- */
export async function encryptAndStoreMessage(
  contractAddress: string,
  inboxId: number,
  signer: ethers.Signer,
  plaintext: string
): Promise<{ txHash: string; handle: string }> {
  console.log(`🧩 Encrypting message for inbox ${inboxId}...`);
  const fhe = await initializeFHE();

  const hub = new ethers.Contract(
    contractAddress,
    ["function inboxes(uint256) view returns (uint256,address,string,uint256,bool)"],
    signer.provider
  );

  const inbox = await hub.inboxes(inboxId);
  const ownerAddress = inbox[1];
  const senderAddress = await signer.getAddress();
  console.log("👤 Inbox owner:", ownerAddress);
  console.log("👤 Message sender:", senderAddress);

  // Create encrypted input - grant decryption rights to the INBOX OWNER
  // Per Zama docs: createEncryptedInput(contractAddress, userAddress)
  // where userAddress is the entity allowed to decrypt (inbox owner)
  console.log("🔐 Creating encrypted input for contract:", contractAddress);
  console.log("🔐 Authorizing decryption for inbox owner:", ownerAddress);
  const input = fhe.createEncryptedInput(contractAddress, ownerAddress);
  const msgBytes = stringToBytes(plaintext);

  // Convert to uint32 chunks for encryption
  const chunks: number[] = [];
  for (let i = 0; i < msgBytes.length; i += 4) {
    const chunk =
      (msgBytes[i] || 0) |
      ((msgBytes[i + 1] || 0) << 8) |
      ((msgBytes[i + 2] || 0) << 16) |
      ((msgBytes[i + 3] || 0) << 24);
    chunks.push(chunk >>> 0);
  }

  chunks.forEach((val) => input.add32(val));

  console.log("🔒 Encrypting message...");
  const encrypted = await input.encrypt();

  const handleHex = ethers.hexlify(encrypted.handles[0]).padEnd(66, "0");
  const proofHex = bytesToHex(encrypted.inputProof);

  console.log("📤 Storing encrypted message on-chain...");
  const hubWithSigner = new ethers.Contract(
    contractAddress,
    ["function storeMessage(uint256, bytes32, bytes) payable"],
    signer
  );

  const tx = await hubWithSigner.storeMessage(inboxId, handleHex, proofHex);
  await tx.wait();

  console.log("✅ Stored encrypted message:", tx.hash);
  return { txHash: tx.hash, handle: handleHex };
}

/* ----------------------------------------------------------
   🔓 Decrypt Message (Owner)
---------------------------------------------------------- */
export async function ownerDecryptMessage(
  contractAddress: string,
  inboxId: number,
  msgIndex: number,
  signer: ethers.Signer
) {
  try {
    const fhe = await initializeFHE();
    console.log(`🔓 Decrypting message #${msgIndex}...`);

    const hub = new ethers.Contract(
      contractAddress,
      [
        "function inboxes(uint256) view returns (uint256,address,string,uint256,bool)",
        "function getMessage(uint256,uint256) view returns (bytes32,bytes,address,uint256,bool)"
      ],
      signer.provider
    );

    const currentUser = await signer.getAddress();
    const inbox = await hub.inboxes(inboxId);
    const inboxOwner = inbox[1];

    if (currentUser.toLowerCase() !== inboxOwner.toLowerCase()) {
      throw new Error("Access denied — only inbox owner can decrypt messages.");
    }

    const message = await hub.getMessage(inboxId, msgIndex);
    const handleBytes = hexToBytes(message[0]);

    console.log("🧩 Handle bytes:", handleBytes.length, "bytes");
    console.log("🧩 Handle hex:", message[0]);
    console.log("🧩 Message sender:", message[2]);
    console.log("🧩 Current user:", currentUser);
    console.log("🧩 Inbox owner:", inboxOwner);

    // Generate keypair for user decryption
    const keypair = fhe.generateKeypair();
    const userAddress = await signer.getAddress();
    
    // CRITICAL: timestamp and durationDays must be STRINGS per Zama docs
    const startTimeStamp = Math.floor(Date.now() / 1000).toString();
    const durationDays = '10';  // String: 10 days expiration
    const contractAddresses = [contractAddress];

    console.log("🔐 Creating EIP-712 signature for relayer...");
    console.log("⏰ Using timestamp:", startTimeStamp);
    console.log("⏰ Duration days:", durationDays);
    
    const eip712 = fhe.createEIP712(
      keypair.publicKey,
      contractAddresses,
      startTimeStamp,
      durationDays
    );

    const signature = await signer.signTypedData(
      eip712.domain,
      {
        UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
      },
      eip712.message
    );

    console.log("🌐 Requesting decryption from relayer...");
    console.log("📋 Decryption request params:");
    console.log("  - Handle:", message[0]);
    console.log("  - Contract:", contractAddress);
    console.log("  - User:", userAddress);
    console.log("  - Timestamp:", startTimeStamp);
    console.log("  - Duration:", durationDays);
    
    // Per Zama docs: userDecrypt expects timestamp and durationDays as strings
    const handleContractPairs = [{ handle: handleBytes, contractAddress }];
    
    const result = await fhe.userDecrypt(
      handleContractPairs,
      keypair.privateKey,
      keypair.publicKey,
      signature.replace("0x", ""),
      contractAddresses,
      userAddress,
      startTimeStamp,
      durationDays
    );

    console.log("📦 Relayer response:", result);
    console.log("📦 Response type:", typeof result);
    console.log("📦 Response keys:", Object.keys(result || {}));

    // Per Zama docs: result is an object with handle as key
    const handleHex = message[0];
    console.log("🔑 Looking for handle:", handleHex);
    
    const decryptedValue = result[handleHex];
    console.log("📦 Decrypted value:", decryptedValue);
    
    if (!decryptedValue) {
      console.error("❌ Handle not found in result. Available keys:", Object.keys(result || {}));
      throw new Error("Relayer returned empty result. Check ACL permissions.");
    }

    // Convert result to plaintext
    console.log("🔄 Converting to plaintext...");
    const bytes = new Uint8Array(Object.values(decryptedValue));
    console.log("📦 Bytes:", bytes);
    const plaintext = new TextDecoder().decode(bytes);
    console.log("✅ Decrypted message:", plaintext);
    return plaintext;

  } catch (error: any) {
    console.error("❌ Decryption failed:", error);
    
    // Provide clear error messages to user
    if (error.message?.includes("Access denied")) {
      throw new Error("Access denied: Only the inbox owner can decrypt messages");
    } else if (error.message?.includes("ACL")) {
      throw new Error("Permission denied: Message not authorized for decryption. The sender may need to grant ACL permissions.");
    } else if (error.message?.includes("relayer") || error.message?.includes("network")) {
      throw new Error("Network error: Unable to connect to Zama relayer. Please check your connection and try again.");
    } else if (error.message?.includes("signature")) {
      throw new Error("Signature error: Please try signing the decryption request again.");
    } else {
      throw new Error(`Decryption failed: ${error.message || "Unknown error occurred"}`);
    }
  }
}

/* ----------------------------------------------------------
   📨 Mark Message as Read (on-chain)
---------------------------------------------------------- */
export async function markMessageAsRead(
  contractAddress: string,
  inboxId: number,
  msgIndex: number,
  signer: ethers.Signer
): Promise<string> {
  console.log("📖 Marking message as read...");

  const hubWithSigner = new ethers.Contract(
    contractAddress,
    ["function markMessageRead(uint256, uint256)"],
    signer
  );

  const tx = await hubWithSigner.markMessageRead(inboxId, msgIndex);
  await tx.wait();

  console.log("✅ Message marked as read:", tx.hash);
  return tx.hash;
}

/* ----------------------------------------------------------
   🔒 Encrypt Data for PrivateQA
---------------------------------------------------------- */
export async function encryptData(
  fheInstance: any,
  plaintext: string,
  contractAddress: string,
  userAddress: string
): Promise<{ encryptedData: any; inputProof: any }> {
  console.log("🔐 Encrypting data...");
  
  // Convert string to number (same as AnonAsk)
  const encoder = new TextEncoder();
  const bytes = encoder.encode(plaintext);
  let value = BigInt(0);
  for (let i = 0; i < Math.min(bytes.length, 16); i++) {
    value = value | (BigInt(bytes[i]) << BigInt(i * 8));
  }
  
  const input = fheInstance.createEncryptedInput(contractAddress, userAddress);
  input.add128(value);
  
  const encrypted = await input.encrypt();
  
  // Convert to hex strings
  const handleBytes = encrypted.handles[0] as Uint8Array;
  const handleHex = '0x' + Array.from(handleBytes).map(b => (b as number).toString(16).padStart(2, '0')).join('');
  
  const proofBytes = encrypted.inputProof as Uint8Array;
  const proofHex = '0x' + Array.from(proofBytes).map(b => (b as number).toString(16).padStart(2, '0')).join('');
  
  console.log("✅ Encrypted - Handle:", handleHex);
  
  return {
    encryptedData: handleHex,
    inputProof: proofHex
  };
}

/* ----------------------------------------------------------
   🔓 Decrypt Question (Host)
---------------------------------------------------------- */
export async function decryptQuestion(
  fheInstance: any,
  contractAddress: string,
  handleBytes: Uint8Array,
  userAddress: string,
  walletClient: any
): Promise<string> {
  console.log("🔓 Decrypting question...");
  
  const keypair = fheInstance.generateKeypair();
  const startTimeStamp = Math.floor(Date.now() / 1000).toString();
  const durationDays = '10';
  const contractAddresses = [contractAddress];

  const eip712 = fheInstance.createEIP712(
    keypair.publicKey,
    contractAddresses,
    startTimeStamp,
    durationDays
  );

  const signature = await walletClient.signTypedData({
    domain: eip712.domain,
    types: {
      UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
    },
    primaryType: 'UserDecryptRequestVerification',
    message: eip712.message
  });

  const handleContractPairs = [{ handle: handleBytes, contractAddress }];
  
  const result = await fheInstance.userDecrypt(
    handleContractPairs,
    keypair.privateKey,
    keypair.publicKey,
    signature.replace("0x", ""),
    contractAddresses,
    userAddress,
    startTimeStamp,
    durationDays
  );

  const handleHex = ethers.hexlify(handleBytes);
  const decryptedValue = result[handleHex];
  
  if (!decryptedValue) {
    throw new Error("Decryption failed: No result from relayer");
  }

  // Convert BigInt back to string
  const value = BigInt(decryptedValue);
  const bytes: number[] = [];
  let tempValue = value;
  
  for (let i = 0; i < 16; i++) {
    const byte = Number(tempValue & BigInt(0xFF));
    if (byte === 0) break;
    bytes.push(byte);
    tempValue = tempValue >> BigInt(8);
  }
  
  const plaintext = new TextDecoder().decode(new Uint8Array(bytes));
  
  console.log("✅ Question decrypted:", plaintext);
  return plaintext;
}

/* ----------------------------------------------------------
   🔓 Decrypt Answer (Asker)
---------------------------------------------------------- */
export async function decryptAnswer(
  fheInstance: any,
  contractAddress: string,
  handleBytes: Uint8Array,
  userAddress: string,
  walletClient: any
): Promise<string> {
  console.log("🔓 Decrypting answer...");
  
  const keypair = fheInstance.generateKeypair();
  const startTimeStamp = Math.floor(Date.now() / 1000).toString();
  const durationDays = '10';
  const contractAddresses = [contractAddress];

  const eip712 = fheInstance.createEIP712(
    keypair.publicKey,
    contractAddresses,
    startTimeStamp,
    durationDays
  );

  const signature = await walletClient.signTypedData({
    domain: eip712.domain,
    types: {
      UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
    },
    primaryType: 'UserDecryptRequestVerification',
    message: eip712.message
  });

  const handleContractPairs = [{ handle: handleBytes, contractAddress }];
  
  const result = await fheInstance.userDecrypt(
    handleContractPairs,
    keypair.privateKey,
    keypair.publicKey,
    signature.replace("0x", ""),
    contractAddresses,
    userAddress,
    startTimeStamp,
    durationDays
  );

  const handleHex = ethers.hexlify(handleBytes);
  const decryptedValue = result[handleHex];
  
  if (!decryptedValue) {
    throw new Error("Decryption failed: No result from relayer");
  }

  // Convert BigInt back to string
  const value = BigInt(decryptedValue);
  const bytes: number[] = [];
  let tempValue = value;
  
  for (let i = 0; i < 16; i++) {
    const byte = Number(tempValue & BigInt(0xFF));
    if (byte === 0) break;
    bytes.push(byte);
    tempValue = tempValue >> BigInt(8);
  }
  
  const plaintext = new TextDecoder().decode(new Uint8Array(bytes));
  
  console.log("✅ Answer decrypted:", plaintext);
  return plaintext;
}

/* ----------------------------------------------------------
   🎰 FairDraw Address Encryption/Decryption
---------------------------------------------------------- */

/**
 * Encrypt an address for FairDraw entry
 */
export async function encryptAddress(
  fheInstance: any,
  address: string,
  contractAddress: string
): Promise<{ encryptedData: any; inputProof: Uint8Array }> {
  console.log("🔐 Encrypting address...");
  
  // Convert address to BigInt
  const addressBigInt = BigInt(address);
  
  // Take lower 128 bits of the address (addresses are 160 bits)
  const addressHash = addressBigInt & ((1n << 128n) - 1n);
  
  // Create encrypted input for the contract
  const input = fheInstance.createEncryptedInput(contractAddress, address);
  input.add128(addressHash);
  
  // Encrypt and get the proof
  const encrypted = await input.encrypt();
  
  // Convert to hex strings
  const handleBytes = encrypted.handles[0] as Uint8Array;
  const handleHex = '0x' + Array.from(handleBytes).map(b => (b as number).toString(16).padStart(2, '0')).join('');
  
  const proofBytes = encrypted.inputProof as Uint8Array;
  const proofHex = '0x' + Array.from(proofBytes).map(b => (b as number).toString(16).padStart(2, '0')).join('');
  
  console.log("✅ Address encrypted");
  return { 
    encryptedData: handleHex, 
    inputProof: proofHex as any
  };
}

/**
 * Decrypt an address from FairDraw entry
 */
export async function decryptAddress(
  fheInstance: any,
  contractAddress: string,
  handleBytes: Uint8Array,
  userAddress: string,
  walletClient: any
): Promise<string> {
  console.log("🔓 Decrypting address from entry...");
  
  const keypair = fheInstance.generateKeypair();
  const contractAddresses = [contractAddress];
  const startTimeStamp = Math.floor(Date.now() / 1000);
  const durationDays = 7;

  const eip712 = fheInstance.createEIP712(
    keypair.publicKey,
    contractAddresses,
    startTimeStamp,
    durationDays
  );

  const signature = await walletClient.signTypedData({
    domain: eip712.domain,
    types: {
      UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
    },
    primaryType: 'UserDecryptRequestVerification',
    message: eip712.message
  });

  const handleContractPairs = [{ handle: handleBytes, contractAddress }];
  
  const result = await fheInstance.userDecrypt(
    handleContractPairs,
    keypair.privateKey,
    keypair.publicKey,
    signature.replace("0x", ""),
    contractAddresses,
    userAddress,
    startTimeStamp,
    durationDays
  );

  const handleHex = ethers.hexlify(handleBytes);
  const decryptedValue = result[handleHex];
  
  if (!decryptedValue) {
    throw new Error("Decryption failed: No result from relayer");
  }

  // Convert BigInt back to address
  const addressBigInt = BigInt(decryptedValue);
  const address = '0x' + addressBigInt.toString(16).padStart(40, '0');
  
  console.log("✅ Address decrypted:", address);
  return address;
}
