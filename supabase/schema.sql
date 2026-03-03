-- Supabase Schema for Favorites Manager
-- Run this in your Supabase SQL Editor
-- Safe to re-run: uses IF NOT EXISTS and DROP POLICY IF EXISTS


-- Create favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  url TEXT,
  thumbnail TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  folder_id UUID,
  is_pinned BOOLEAN DEFAULT false,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add folder_id column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'favorites' AND column_name = 'folder_id'
  ) THEN
    ALTER TABLE favorites ADD COLUMN folder_id UUID;
  END IF;
END $$;

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#64748b',
  icon TEXT DEFAULT 'Folder',
  created_at BIGINT NOT NULL
);

-- Create sync_metadata table
CREATE TABLE IF NOT EXISTS sync_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_sync BIGINT NOT NULL,
  device_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security on all tables
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_metadata ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies (safe to re-run)
DROP POLICY IF EXISTS "Users can only access their own favorites" ON favorites;
CREATE POLICY "Users can only access their own favorites"
  ON favorites FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access their own tags" ON tags;
CREATE POLICY "Users can only access their own tags"
  ON tags FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access their own folders" ON folders;
CREATE POLICY "Users can only access their own folders"
  ON folders FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only access their own sync metadata" ON sync_metadata;
CREATE POLICY "Users can only access their own sync metadata"
  ON sync_metadata FOR ALL USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_type ON favorites(type);
CREATE INDEX IF NOT EXISTS idx_favorites_is_pinned ON favorites(is_pinned);
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at);
CREATE INDEX IF NOT EXISTS idx_favorites_folder_id ON favorites(folder_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_metadata_user_id ON sync_metadata(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at_timestamp = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers (drop first to avoid duplicates)
DROP TRIGGER IF EXISTS update_favorites_updated_at ON favorites;
CREATE TRIGGER update_favorites_updated_at
  BEFORE UPDATE ON favorites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tags_updated_at ON tags;
CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sync_metadata_updated_at ON sync_metadata;
CREATE TRIGGER update_sync_metadata_updated_at
  BEFORE UPDATE ON sync_metadata
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON favorites TO authenticated;
GRANT ALL ON tags TO authenticated;
GRANT ALL ON folders TO authenticated;
GRANT ALL ON sync_metadata TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
