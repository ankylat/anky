package handlers

import (
	"fmt"
	"net/http"

	"github.com/ethereum/go-ethereum/crypto"
	"github.com/gin-gonic/gin"
	"github.com/tyler-smith/go-bip39"
)

func CreateNewWallet(c *gin.Context) {
	// Generate entropy for mnemonic
	entropy, err := bip39.NewEntropy(128) // 128 bits = 12 words
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to generate entropy: %v", err)})
		return
	}

	// Generate mnemonic
	mnemonic, err := bip39.NewMnemonic(entropy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to generate mnemonic: %v", err)})
		return
	}

	// Create seed from mnemonic
	seed := bip39.NewSeed(mnemonic, "")

	// Generate private key from seed
	privateKey, err := crypto.ToECDSA(seed[:32])
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to generate private key: %v", err)})
		return
	}

	// Generate Ethereum address from private key
	address := crypto.PubkeyToAddress(privateKey.PublicKey)

	// Return the mnemonic and address to the user
	c.JSON(http.StatusOK, gin.H{
		"mnemonic": mnemonic,
		"address":  address.Hex(),
	})
}
