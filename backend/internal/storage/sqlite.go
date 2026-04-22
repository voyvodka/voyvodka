package storage

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

type SQLite struct {
	db *sql.DB
}

type CacheEntry struct {
	Payload   []byte
	UpdatedAt time.Time
}

func New(path string) (*SQLite, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, fmt.Errorf("create sqlite dir: %w", err)
	}

	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	db.SetMaxOpenConns(1)

	store := &SQLite{db: db}
	if err := store.migrate(context.Background()); err != nil {
		_ = db.Close()
		return nil, err
	}

	return store, nil
}

func (s *SQLite) Close() error {
	return s.db.Close()
}

func (s *SQLite) GetCache(ctx context.Context, key string) (CacheEntry, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT payload, updated_at
		FROM cache_entries
		WHERE cache_key = ?
	`, key)

	var entry CacheEntry
	err := row.Scan(&entry.Payload, &entry.UpdatedAt)
	return entry, err
}

func (s *SQLite) UpsertCache(ctx context.Context, key string, payload []byte, updatedAt time.Time) error {
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO cache_entries(cache_key, payload, updated_at)
		VALUES(?, ?, ?)
		ON CONFLICT(cache_key) DO UPDATE SET
			payload = excluded.payload,
			updated_at = excluded.updated_at
	`, key, payload, updatedAt.UTC())

	return err
}

// DeleteCacheNotIn removes every cache entry whose key starts with prefix but
// is not present in keep. Used after a portfolio refresh to purge detail
// cache entries for repos that are no longer owned (deleted, renamed, or made
// private upstream). Returns the number of rows removed.
func (s *SQLite) DeleteCacheNotIn(ctx context.Context, prefix string, keep []string) (int, error) {
	var (
		res sql.Result
		err error
	)
	if len(keep) == 0 {
		res, err = s.db.ExecContext(ctx,
			`DELETE FROM cache_entries WHERE cache_key LIKE ? || '%'`, prefix)
	} else {
		placeholders := make([]string, len(keep))
		args := make([]any, 0, len(keep)+1)
		args = append(args, prefix)
		for i, k := range keep {
			placeholders[i] = "?"
			args = append(args, k)
		}
		q := fmt.Sprintf(
			`DELETE FROM cache_entries WHERE cache_key LIKE ? || '%%' AND cache_key NOT IN (%s)`,
			strings.Join(placeholders, ","),
		)
		res, err = s.db.ExecContext(ctx, q, args...)
	}
	if err != nil {
		return 0, err
	}
	n, _ := res.RowsAffected()
	return int(n), nil
}

func (s *SQLite) migrate(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS cache_entries (
			cache_key TEXT PRIMARY KEY,
			payload BLOB NOT NULL,
			updated_at DATETIME NOT NULL
		)
	`)
	if err != nil {
		return fmt.Errorf("migrate cache_entries: %w", err)
	}

	return nil
}
