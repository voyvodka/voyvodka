package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"portfolio/backend/internal/app"
)

func main() {
	// Load .env from the current working directory when present. In Docker
	// and other containerized flows, environment variables are already set
	// via --env-file, so a missing .env here is expected — ignore the error.
	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		log.Printf(".env load warning: %v", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	application, err := app.New()
	if err != nil {
		log.Fatalf("failed to initialize app: %v", err)
	}
	defer application.Close()

	server := &http.Server{
		Addr:         ":" + application.Config.Port,
		Handler:      application.Router,
		// Security enhancement: Prevent Slowloris DoS attacks by enforcing a strict timeout on reading headers.
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		log.Printf("api listening on :%s", application.Config.Port)
		errCh <- server.ListenAndServe()
	}()

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			log.Printf("server shutdown error: %v", err)
		}
	case err := <-errCh:
		if err != nil && err != http.ErrServerClosed {
			log.Printf("server error: %v", err)
			os.Exit(1)
		}
	}
}
