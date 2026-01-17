#!/bin/bash

echo "=== Verifying DChat Smart Contracts on Etherscan ==="
echo ""

# Set API key
export ETHERSCAN_API_KEY="R7QKYEH7VUC7392GN4K89WSB6QIWKFN2CB"

# Contract addresses from deployment-complete-addresses.json
USER_IDENTITY="0xa9403dCaBE90076e5aB9d942A2076f50ba96Ac2A"
MESSAGE_STORAGE="0x026371EA6a59Fc1B42551f44cd1fedA9521b09F5"
PAYMENT_ESCROW="0x199e4e527e625b7BF816a56Dbe65635EFf653500"
PROJECT_COLLAB="0x6Cb92a0D491e3316091e4C8680dFAD8009785579"
LIVING_PORTFOLIO="0x1B57F4fA3fdc02b1F6c7F1b9646Ddfa6d7f86B48"

echo "1. Verifying UserIdentityV2..."
npx hardhat verify --network sepolia $USER_IDENTITY
echo ""

echo "2. Verifying MessageStorageV2..."
npx hardhat verify --network sepolia $MESSAGE_STORAGE
echo ""

echo "3. Verifying PaymentEscrow..."
npx hardhat verify --network sepolia $PAYMENT_ESCROW
echo ""

echo "4. Verifying ProjectCollaboration..."
npx hardhat verify --network sepolia $PROJECT_COLLAB
echo ""

echo "5. Verifying LivingPortfolio..."
npx hardhat verify --network sepolia $LIVING_PORTFOLIO
echo ""

echo "=== Verification Complete ==="
