---
"@owoce/tangle-router": patch
"@owoce/tangle": patch
---

fix: notFound was incorrectly exported from a "use client" file, making it impossible to call it on the server
