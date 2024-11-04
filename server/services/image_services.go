package services

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"github.com/gin-gonic/gin"
)

type ImageService struct {
	Cld *cloudinary.Cloudinary
	Ctx context.Context
}

func NewImageService() (*ImageService, error) {
	cld, err := cloudinary.NewFromURL(os.Getenv("CLOUDINARY_URL"))
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Cloudinary: %v", err)
	}
	cld.Config.URL.Secure = true
	ctx := context.Background()
	return &ImageService{Cld: cld, Ctx: ctx}, nil
}

func (s *ImageService) UploadImage(c *gin.Context) {
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

	resp, err := s.Cld.Upload.Upload(s.Ctx, file, uploadParams)
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

func (s *ImageService) DeleteImage(c *gin.Context) {
	publicID := c.Param("publicID")
	if publicID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Public ID is required"})
		return
	}

	_, err := s.Cld.Upload.Destroy(s.Ctx, uploader.DestroyParams{PublicID: publicID})
	if err != nil {
		log.Printf("Error deleting image: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete image"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Image deleted successfully"})
}

func (s *ImageService) GetImage(c *gin.Context) {
	publicID := c.Param("publicID")
	if publicID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Public ID is required"})
		return
	}

	asset, err := s.Cld.Image(publicID)
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

func uploadImageToCloudinary(imageHandler *ImageService, imageURL, sessionID string) (*uploader.UploadResult, error) {
	resp, err := http.Get(imageURL)
	if err != nil {
		return nil, fmt.Errorf("error downloading image: %v", err)
	}
	defer resp.Body.Close()

	tempFile, err := os.CreateTemp("", fmt.Sprintf("%s.png", sessionID))
	if err != nil {
		return nil, fmt.Errorf("error creating temporary file: %v", err)
	}
	defer os.Remove(tempFile.Name())

	_, err = io.Copy(tempFile, resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error saving downloaded image: %v", err)
	}

	_, err = tempFile.Seek(0, 0)
	if err != nil {
		return nil, fmt.Errorf("error rewinding temporary file: %v", err)
	}

	uploadResult, err := imageHandler.Cld.Upload.Upload(imageHandler.Ctx, tempFile, uploader.UploadParams{
		PublicID:     sessionID,
		UploadPreset: "anky_mobile",
	})
	if err != nil {
		return nil, fmt.Errorf("error uploading image to Cloudinary: %v", err)
	}

	return uploadResult, nil
}
