## 2024-02-12 - JSON Parsing Efficiency for Large API Lists
**Learning:** Fetching large lists of complex JSON objects (like 100 repositories from GitHub) with a struct that defines unused fields causes `encoding/json` to needlessly parse, allocate, and retain memory for those fields (e.g., arrays, nested objects).
**Action:** Always create a specialized "summary" struct that defines only the fields strictly necessary for the list operation to eliminate reflection overhead and memory bloat.
