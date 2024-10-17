package handlers

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ankylat/anky/server/services"
)

func HandleUserCasts(c *gin.Context) {
	fidStr := c.Param("fid")
	log.Printf("Received request for FID: %s", fidStr)

	fid, err := strconv.Atoi(fidStr)
	if err != nil {
		log.Printf("Error converting FID to integer: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid FID"})
		return
	}

	neynarService := services.NewNeynarService()
	log.Printf("Fetching casts for FID: %d", fid)

	casts, err := neynarService.FetchUserCasts(fid)
	if err != nil {
		log.Printf("Error fetching casts: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch casts"})
		return
	}

	log.Printf("Successfully fetched %d casts for FID: %d", len(casts), fid)
	c.JSON(http.StatusOK, casts)
}