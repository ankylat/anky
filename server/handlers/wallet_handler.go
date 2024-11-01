package handlers

import (
	"fmt"

	"github.com/ethereum/go-ethereum/crypto"
	"github.com/tyler-smith/go-bip39"
)

func CreateNewWallet() (map[string]string, error) {
	// Generate entropy for mnemonic
	entropy, err := bip39.NewEntropy(128) // 128 bits = 12 words
	if err != nil {
		return nil, fmt.Errorf("failed to generate entropy: %v", err)
	}

	// Generate mnemonic
	mnemonic, err := bip39.NewMnemonic(entropy)
	if err != nil {
		return nil, fmt.Errorf("failed to generate mnemonic: %v", err)
	}

	// Create seed from mnemonic
	seed := bip39.NewSeed(mnemonic, "")

	// Generate private key from seed
	privateKey, err := crypto.ToECDSA(seed[:32])
	if err != nil {
		return nil, fmt.Errorf("failed to generate private key: %v", err)
	}

	// Generate Ethereum address from private key
	address := crypto.PubkeyToAddress(privateKey.PublicKey)

	// Return the mnemonic and address
	return map[string]string{
		"mnemonic": mnemonic,
		"address":  address.Hex(),
	}, nil
}
