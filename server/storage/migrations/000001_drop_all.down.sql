-- Since this migration drops everything, the down migration should do nothing
-- or recreate a base state if needed
-- In this case, we'll just ensure the UUID extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";