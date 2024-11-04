```markdown
# Database Management Guide

## Current Database Structure

### Core Tables
- **privy_users**: Authentication and user identity
- **linked_accounts**: Connected social/wallet accounts
- **users**: Main user profiles
- **writing_sessions**: Individual writing sessions
- **ankys**: Generated content and reflections
- **badges**: User achievements and rewards

### Key Relationships
- Each writing session belongs to a user
- Ankys can be linked to writing sessions and other ankys (previous_anky_id)
- Badges belong to users
- Linked accounts connect to privy_users

## How to Update the Database

### Step 1: Create a New Migration
```bash
# Use the migrate tool to create new migration files
migrate create -ext sql -dir storage/migrations -seq your_change_name

# This creates two files:
# - {version}_your_change_name.up.sql   (changes to apply)
# - {version}_your_change_name.down.sql (how to undo changes)
```

### Step 2: Write the Migration Files

In the .up.sql file:
```sql
-- Add new columns
ALTER TABLE table_name ADD COLUMN new_column_name TYPE;

-- Modify existing columns
ALTER TABLE table_name ALTER COLUMN column_name TYPE new_type;

-- Add new constraints
ALTER TABLE table_name ADD CONSTRAINT constraint_name ...;
```

In the .down.sql file:
```sql
-- Always write the reverse operations
ALTER TABLE table_name DROP COLUMN new_column_name;
ALTER TABLE table_name ALTER COLUMN column_name TYPE original_type;
ALTER TABLE table_name DROP CONSTRAINT constraint_name;
```

### Step 3: Test the Migration

```bash
# Apply the migration
migrate -database "postgresql://anky:development@localhost:5555/anky_db?sslmode=disable" -path ./storage/migrations up

# If something goes wrong, roll back
migrate -database "postgresql://anky:development@localhost:5555/anky_db?sslmode=disable" -path ./storage/migrations down
```

## Best Practices

1. **Always Create Both Up and Down Migrations**
   - Up: What changes you want to make
   - Down: How to undo those changes
   - This allows rolling back if something goes wrong

2. **Make Migrations Incremental**
   - One logical change per migration
   - Don't combine multiple unrelated changes
   - Makes it easier to track and rollback changes

3. **Test Data Preservation**
   - Ensure migrations don't accidentally delete existing data
   - Use ALTER and ADD instead of DROP when possible
   - Include data migration steps if needed

4. **Handle Dependencies**
   - Add new tables/columns before creating foreign keys (Database rules that make one table's column refer to another table's unique identifier.)
   - Remove foreign keys before removing referenced columns
   - Consider the order of operations (Commands that change database structure or data.)

5. **Version Control**
   - Commit migration files to git
   - Never modify existing migration files
   - Create new migrations to fix mistakes

## Common Operations

### Adding a New Column
```sql
-- Up migration
ALTER TABLE table_name
ADD COLUMN column_name column_type;

-- Down migration
ALTER TABLE table_name
DROP COLUMN column_name;
```

### Modifying a Column
```sql
-- Up migration
ALTER TABLE table_name
ALTER COLUMN column_name TYPE new_type;

-- Down migration
ALTER TABLE table_name
ALTER COLUMN column_name TYPE original_type;
```

### Adding an Index
```sql
-- Up migration
CREATE INDEX index_name ON table_name(column_name);

-- Down migration
DROP INDEX index_name;
```

## Emergency Procedures

### If Migration Fails
1. Check the error message
2. Run `migrate down` to rollback
3. Fix the migration files
4. Try again with `migrate up`

### To Reset Everything
```bash
# Nuclear option - resets entire database
make db-reset

# Or step by step:
make db-nuke
make db-migrate
```

### To Check Current Status
```bash
# Connect to database
docker exec -it anky-postgres psql -U anky -d anky_db

# List tables
\dt

# Describe specific table
\d+ table_name
```

## Updating Go Types

1. Update the type definitions in `/types/anky.go`
2. Create corresponding database migrations
3. Update any affected queries in your code
4. Test thoroughly with sample data
5. Consider backward compatibility
6. Deploy database changes before code changes

Remember: Always backup your database before applying migrations in production!
```