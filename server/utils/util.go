package utils

import (
	"net/http"
	"os"
	"time"

	"github.com/ankylat/anky/server/types"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

func GetUserID(r *http.Request) (uuid.UUID, error) {
	vars := mux.Vars(r)
	return uuid.Parse(vars["id"])
}

func GetAnkyID(r *http.Request) (uuid.UUID, error) {
	vars := mux.Vars(r)
	return uuid.Parse(vars["id"])
}

func CreateJWT(user *types.User) (string, error) {
	claims := &jwt.MapClaims{
		"expiresAt": time.Now().Add(400 * 24 * time.Hour).Unix(),
		"userID":    user.ID,
	}

	secretKey := os.Getenv("JWT_SECRET")
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	return token.SignedString([]byte(secretKey))
}

func ValidateJWT(token string) (*jwt.MapClaims, error) {
	secretKey := os.Getenv("JWT_SECRET")
	parsedToken, err := jwt.Parse(token, func(token *jwt.Token) (interface{}, error) {
		return []byte(secretKey), nil
	})
	if err != nil {
		return nil, err
	}

	if claims, ok := parsedToken.Claims.(jwt.MapClaims); ok && parsedToken.Valid {
		return &claims, nil
	}

	return nil, jwt.ErrSignatureInvalid
}
