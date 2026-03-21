import { ethers } from 'ethers';
import { useWallet } from '../contexts/WalletContext';

export const useContract = (contractAddress: string, abi: any) => {
  const { signer } = useWallet();

  if (!signer) {
    return null;
  }

  return new ethers.Contract(contractAddress, abi, signer);
};

export const useReadContract = (contractAddress: string, abi: any) => {
  const { provider } = useWallet();

  if (!provider) {
    return null;
  }

  return new ethers.Contract(contractAddress, abi, provider);
};
