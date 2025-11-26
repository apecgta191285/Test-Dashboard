@echo off
echo Starting Backend in production mode...
set DATABASE_URL=file:./prisma/dev.db
node dist/src/main.js
