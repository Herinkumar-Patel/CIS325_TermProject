# TaskBridge Schema

Database: `taskbridge.db`

## Table: users
Columns: `id`, `fullName`, `email`, `passwordHash`, `createdAt`

## Table: tasks
Columns: `id`, `userId`, `title`, `description`, `course`, `dueDate`, `priority`, `status`, `createdAt`

## Table: projects
Columns: `id`, `ownerId`, `title`, `description`, `course`, `dueDate`, `createdAt`

## Table: project_members
Columns: `id`, `projectId`, `memberName`, `memberEmail`, `role`

## Table: reminders
Columns: `id`, `userId`, `message`, `remindAt`, `isRead`, `createdAt`

## Table: notes
Columns: `id`, `userId`, `title`, `content`, `createdAt`

## Table: uploads
Columns: `id`, `userId`, `originalName`, `storedName`, `filePath`, `createdAt`
