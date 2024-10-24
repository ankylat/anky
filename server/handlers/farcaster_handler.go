package handlers

import (
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/ankylat/anky/server/services"
	"github.com/gin-gonic/gin"
)

func GetFarcasterUser(c *gin.Context) {
	log.Println("GetFarcasterUser: Starting function")
	fidStr := c.Param("fid")
	log.Printf("GetFarcasterUser: Received FID: %s", fidStr)
	fid, err := strconv.Atoi(fidStr)
	if err != nil {
		log.Printf("GetFarcasterUser: Error converting FID to int: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid FID"})
		return
	}

	log.Println("GetFarcasterUser: Creating FarcasterService")
	farcasterService := services.NewFarcasterService()
	log.Printf("GetFarcasterUser: Fetching user for FID: %d", fid)
	user, err := farcasterService.GetUserByFid(fid)
	if err != nil {
		log.Printf("GetFarcasterUser: Error fetching user: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to fetch user: %v", err)})
		return
	}

	log.Println("GetFarcasterUser: Successfully fetched user, returning response")
	c.JSON(http.StatusOK, user)
}

func CreateCast(c *gin.Context) {
	log.Println("CreateCast: Starting function")
	var requestBody struct {
		SignerUUID string `json:"signer_uuid" binding:"required"`
		Text       string `json:"text" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		log.Printf("CreateCast: Error binding JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log.Printf("CreateCast: Received request - SignerUUID: %s, Text: %s", requestBody.SignerUUID, requestBody.Text)
	log.Println("CreateCast: Creating FarcasterService")
	farcasterService := services.NewFarcasterService()
	log.Println("CreateCast: Calling CreateCast on FarcasterService")
	result, err := farcasterService.CreateCast(requestBody.SignerUUID, requestBody.Text)
	if err != nil {
		log.Printf("CreateCast: Error creating cast: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to create cast: %v", err)})
		return
	}

	log.Println("CreateCast: Successfully created cast, returning response")
	c.JSON(http.StatusOK, result)
}

func GetUserCastsByFid(c *gin.Context) {
	log.Println("GetUserCastsByFid: Starting function")
	fidStr := c.Param("fid")
	log.Printf("GetUserCastsByFid: Received FID: %s", fidStr)
	fid, err := strconv.Atoi(fidStr)
	if err != nil {
		log.Printf("GetUserCastsByFid: Error converting FID to int: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid FID"})
		return
	}

	cursor := c.DefaultQuery("cursor", "")
	limitStr := c.DefaultQuery("limit", "10")
	log.Printf("GetUserCastsByFid: Received cursor: %s, limit: %s", cursor, limitStr)
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		log.Printf("GetUserCastsByFid: Error converting limit to int: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid limit"})
		return
	}

	log.Println("GetUserCastsByFid: Creating FarcasterService")
	farcasterService := services.NewFarcasterService()
	log.Printf("GetUserCastsByFid: Fetching casts for FID: %d, cursor: %s, limit: %d", fid, cursor, limit)
	casts, err := farcasterService.GetUserCasts(fid, cursor, limit)
	if err != nil {
		log.Printf("GetUserCastsByFid: Error fetching casts: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to fetch casts: %v", err)})
		return
	}

	log.Println("GetUserCastsByFid: Successfully fetched casts, returning response")
	c.JSON(http.StatusOK, casts)
}

func CreateCastReaction(c *gin.Context) {
	log.Println("CreateCastReaction: Starting function")
	var requestBody struct {
		SignerUUID   string `json:"signer_uuid" binding:"required"`
		ReactionType string `json:"reaction_type" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestBody); err != nil {
		log.Printf("CreateCastReaction: Error binding JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hash := c.Param("hash")
	log.Printf("CreateCastReaction: Received request - SignerUUID: %s, ReactionType: %s, Hash: %s", requestBody.SignerUUID, requestBody.ReactionType, hash)

	log.Println("CreateCastReaction: Creating FarcasterService")
	farcasterService := services.NewFarcasterService()
	log.Println("CreateCastReaction: Calling CreateCastReaction on FarcasterService")
	result, err := farcasterService.CreateCastReaction(requestBody.SignerUUID, hash, requestBody.ReactionType)
	if err != nil {
		log.Printf("CreateCastReaction: Error creating reaction: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to create reaction: %v", err)})
		return
	}

	log.Println("CreateCastReaction: Successfully created reaction, returning response")
	c.JSON(http.StatusOK, result)
}

func GetCastFromHash(c *gin.Context) {
	log.Println("GetCastFromHash: Starting function")
	hash := c.Param("hash")
	log.Printf("GetCastFromHash: Received hash: %s", hash)

	log.Println("GetCastFromHash: Creating FarcasterService")
	farcasterService := services.NewFarcasterService()
	log.Printf("GetCastFromHash: Fetching cast for hash: %s", hash)
	cast, err := farcasterService.GetCastByHash(hash)
	if err != nil {
		log.Printf("GetCastFromHash: Error fetching cast: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to fetch cast: %v", err)})
		return
	}

	log.Println("GetCastFromHash: Successfully fetched cast, returning response")
	c.JSON(http.StatusOK, cast["cast"])
}
