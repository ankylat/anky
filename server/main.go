package main

import (
	"github.com/gin-gonic/gin"
	"github.com/ankylat/anky/server/handlers"
)

func main() {
	r := gin.Default()

	r.POST("/talk-to-anky", handlers.HandleChat)
	r.GET("/user-casts/:fid", handlers.HandleUserCasts)

	r.Run(":8080")
}