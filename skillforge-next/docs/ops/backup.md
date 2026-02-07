# Backup and Restore

The backend uses a SQLite database referenced by `DATABASE_URL` (file-based).

## Backup

```bash
npm run db:backup
```

Backups are stored in `backups/` with timestamped filenames.

## Restore

Stop the server before restoring.

```bash
npm run db:restore -- --file backups/skillforge-YYYY-MM-DDTHH-MM-SS-sssZ.db
```

You can also set `BACKUP_FILE` to avoid the CLI flag. If no file is provided, the most recent backup in `backups/` is used.
