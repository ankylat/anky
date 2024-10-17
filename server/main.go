package main

import (
	"math/rand"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()

	r.GET("/ping", handleRequest)
	r.POST("/ping", handleRequest)

	r.Run(":8080")
}

func handleRequest(c *gin.Context) {
	response := gin.H{
		"random_number": rand.Intn(888) + 1,
		"timestamp":     time.Now().Unix(),
		"name":          "pong",
	}

	c.JSON(http.StatusOK, response)
}
