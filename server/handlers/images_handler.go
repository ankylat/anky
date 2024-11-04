package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"github.com/gin-gonic/gin"
)

type ImageHandler struct {
	Cld *cloudinary.Cloudinary
	Ctx context.Context
}

func NewImageHandler() (*ImageHandler, error) {
	cld, err := cloudinary.NewFromURL(os.Getenv("CLOUDINARY_URL"))
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Cloudinary: %v", err)
	}
	cld.Config.URL.Secure = true
	ctx := context.Background()
	return &ImageHandler{Cld: cld, Ctx: ctx}, nil
}

func (h *ImageHandler) UploadImage(c *gin.Context) {
	file, header, err := c.Request.FormFile("image")
	if err != nil {
		log.Printf("Error getting file: %v", err)
		fmt.Println("Error getting file:", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}
	defer file.Close()

	uploadParams := uploader.UploadParams{
		PublicID:       header.Filename,
		UniqueFilename: api.Bool(true),
		Overwrite:      api.Bool(false),
		UploadPreset:   "anky_mobile",
	}

	resp, err := h.Cld.Upload.Upload(h.Ctx, file, uploadParams)
	if err != nil {
		log.Printf("Error uploading file: %v", err)
		fmt.Println("Error uploading file:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload image"})
		return
	}

	fmt.Println("Image uploaded successfully")
	fmt.Println("Public ID:", resp.PublicID)
	fmt.Println("URL:", resp.SecureURL)

	c.JSON(http.StatusOK, gin.H{
		"message":   "Image uploaded successfully",
		"public_id": resp.PublicID,
		"url":       resp.SecureURL,
	})
}

func (h *ImageHandler) DeleteImage(c *gin.Context) {
	publicID := c.Param("publicID")
	if publicID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Public ID is required"})
		return
	}

	_, err := h.Cld.Upload.Destroy(h.Ctx, uploader.DestroyParams{PublicID: publicID})
	if err != nil {
		log.Printf("Error deleting image: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete image"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Image deleted successfully"})
}

func (h *ImageHandler) GetImage(c *gin.Context) {
	publicID := c.Param("publicID")
	if publicID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Public ID is required"})
		return
	}

	asset, err := h.Cld.Image(publicID)
	if err != nil {
		log.Printf("Error getting image URL: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get image URL"})
		return
	}

	url, err := asset.String()
	if err != nil {
		log.Printf("Error getting image URL: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get image URL"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}
