## 2024-05-14 - Concurrent Fetch with Cancellation Short-Circuit
**Learning:** Using `sync.WaitGroup` with `context.WithCancel` and a results channel is a powerful pattern in this Go backend for speeding up prioritization-based API calls (like checking CNAMEs). It allows aborting slow secondary requests once the preferred/highest-priority primary request returns successfully.
**Action:** When seeing sequential API candidate resolution or uncancelled parallel fetching in Go services, consider using `sync.WaitGroup` and cancelling the context immediately upon receiving the highest priority hit.
