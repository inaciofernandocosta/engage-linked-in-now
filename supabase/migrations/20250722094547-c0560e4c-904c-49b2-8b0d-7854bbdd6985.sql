
-- Add a new column to store multiple images as JSONB array
ALTER TABLE public.posts 
ADD COLUMN images JSONB DEFAULT '[]'::jsonb;

-- Update existing posts to migrate single image_url to images array
UPDATE public.posts 
SET images = CASE 
  WHEN image_url IS NOT NULL THEN 
    jsonb_build_array(
      jsonb_build_object(
        'url', image_url,
        'name', 'migrated-image.jpg',
        'storage_path', image_storage_path
      )
    )
  ELSE '[]'::jsonb
END
WHERE images = '[]'::jsonb;

-- Add a comment to document the new column
COMMENT ON COLUMN public.posts.images IS 'Array of image objects with url, name, and storage_path properties';
