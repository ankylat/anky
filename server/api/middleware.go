package api

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/time/rate"
)

// PrivyAuth is a middleware function that authenticates requests using Privy
func PrivyAuth(appID, appSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			log.Println("[PrivyAuth] Starting authentication")

			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				log.Println("[PrivyAuth] Missing authorization header")
				WriteJSON(w, http.StatusUnauthorized, ApiError{Error: "Missing authorization header"})
				return
			}
			log.Printf("[PrivyAuth] Received authorization header: %s", authHeader[:10]+"...")

			token := strings.TrimPrefix(authHeader, "Bearer ")
			log.Printf("[PrivyAuth] Processing token: %s", token[:10]+"...")

			// Define custom claims struct
			type PrivyClaims struct {
				jwt.RegisteredClaims
				AppId  string `json:"aud,omitempty"`
				UserId string `json:"sub,omitempty"`
			}

			// Parse and validate the token
			log.Println("[PrivyAuth] Parsing JWT token")
			parsedToken, err := jwt.ParseWithClaims(token, &PrivyClaims{}, func(token *jwt.Token) (interface{}, error) {
				log.Printf("[PrivyAuth] Checking signing method: %s", token.Method.Alg())
				if token.Method.Alg() != "ES256" {
					log.Printf("[PrivyAuth] Invalid signing method: %s", token.Method.Alg())
					return nil, fmt.Errorf("unexpected JWT signing method=%v", token.Header["alg"])
				}

				log.Println("[PrivyAuth] Parsing public key")
				pubKey, err := jwt.ParseECPublicKeyFromPEM([]byte(appSecret))
				if err != nil {
					log.Printf("[PrivyAuth] Failed to parse public key: %v", err)
					return nil, fmt.Errorf("failed to parse public key: %v", err)
				}
				log.Println("[PrivyAuth] Public key parsed successfully")

				return pubKey, nil
			})

			if err != nil {
				log.Printf("[PrivyAuth] Token parsing failed: %v", err)
				WriteJSON(w, http.StatusUnauthorized, ApiError{Error: fmt.Sprintf("Invalid token: %v", err)})
				return
			}
			log.Println("[PrivyAuth] Token parsed successfully")

			claims, ok := parsedToken.Claims.(*PrivyClaims)
			if !ok || !parsedToken.Valid {
				log.Println("[PrivyAuth] Invalid token claims or token not valid")
				WriteJSON(w, http.StatusUnauthorized, ApiError{Error: "Invalid token claims"})
				return
			}
			log.Printf("[PrivyAuth] Claims extracted successfully for user: %s", claims.UserId)

			// Validate specific claims
			log.Printf("[PrivyAuth] Validating app ID: %s", claims.AppId)
			if claims.AppId != appID {
				log.Printf("[PrivyAuth] Invalid app ID: expected %s, got %s", appID, claims.AppId)
				WriteJSON(w, http.StatusUnauthorized, ApiError{Error: "Invalid app ID"})
				return
			}

			log.Printf("[PrivyAuth] Validating issuer: %s", claims.Issuer)
			if claims.Issuer != "privy.io" {
				log.Printf("[PrivyAuth] Invalid issuer: %s", claims.Issuer)
				WriteJSON(w, http.StatusUnauthorized, ApiError{Error: "Invalid issuer"})
				return
			}

			// Store user ID in context
			ctx := context.WithValue(r.Context(), UserIDKey, claims.UserId)
			log.Printf("[PrivyAuth] Authentication successful for user: %s", claims.UserId)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// UserIDKey is a type-safe context key for user ID
type contextKey string

const UserIDKey contextKey = "userID"

// Logger is a middleware function that logs request details
func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		path := r.URL.Path
		raw := r.URL.RawQuery

		// Call the next handler
		next.ServeHTTP(w, r)

		// Calculate request duration and log request details
		latency := time.Since(start)
		clientIP := r.RemoteAddr
		method := r.Method

		if raw != "" {
			path = path + "?" + raw
		}

		log.Printf("[HTTP] %v | %15s | %-7s %s | %13v\n",
			start.Format("2006/01/02 - 15:04:05"),
			clientIP,
			method,
			path,
			latency,
		)
	})
}

// RateLimiter is a middleware function that implements rate limiting
func RateLimiter(next http.Handler) http.Handler {
	// Create a new rate limiter that allows 1 request per second with a burst of 5
	limiter := rate.NewLimiter(1, 5)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check if the request is allowed based on the rate limit
		if !limiter.Allow() {
			WriteJSON(w, http.StatusTooManyRequests, ApiError{Error: "Too many requests"})
			return
		}
		next.ServeHTTP(w, r)
	})
}
