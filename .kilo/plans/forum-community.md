# Plan: Forum Community

## Konteks

Chat infrastructure (WebSocket + REST) sudah ada tapi zero UI. Forum komunitas perlu: categories, threads, posts, moderation.

## Task

### Task 1: Prisma Models

- `ForumCategory` — nama, deskripsi, order
- `ForumThread` — judul, konten, categoryId, authorId (Anggota), isPinned, isLocked, viewCount
- `ForumPost` — konten, threadId, authorId (Anggota), isSolution

### Task 2: API Module

- `GET /forum/categories` — list categories
- `GET /forum/categories/:id/threads` — threads by category
- `POST /forum/threads` — create thread
- `GET /forum/threads/:id` — thread detail + posts
- `POST /forum/threads/:id/posts` — reply to thread
- `PATCH /forum/threads/:id/pin` — pin thread (admin)
- `PATCH /forum/threads/:id/lock` — lock thread (admin)
- `DELETE /forum/threads/:id` — delete thread (admin/author)
- `DELETE /forum/posts/:id` — delete post (admin/author)

### Task 3: Web Forum Pages

- `/forum` — categories list
- `/forum/c/[categoryId]` — threads in category
- `/forum/t/[threadId]` — thread detail + replies
- `/forum/new` — create new thread

### Task 4: Mobile Forum Screens

- Categories list → threads list → thread detail + replies
- Create thread form

## Urutan

| #   | Task           | Prioritas |
| --- | -------------- | --------- |
| 1   | Prisma models  | High      |
| 2   | API module     | High      |
| 3   | Web pages      | High      |
| 4   | Mobile screens | Medium    |
