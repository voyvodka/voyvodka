package storage

import (
	"context"
	"time"
)

type Store interface {
	GetCache(ctx context.Context, key string) (CacheEntry, error)
	UpsertCache(ctx context.Context, key string, payload []byte, updatedAt time.Time) error
	Close() error
}
