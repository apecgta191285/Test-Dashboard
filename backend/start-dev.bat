@echo off
echo Starting Backend in development mode with increased memory...
set DATABASE_URL=file:./prisma/dev.db
set NODE_OPTIONS=--max-old-space-size=4096
npm run start:dev


