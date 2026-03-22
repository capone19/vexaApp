-- Create the chat-attachments storage bucket (public, for sending media via WhatsApp)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  true,
  16777216, -- 16 MB
  ARRAY[
    'image/jpeg','image/png','image/gif','image/webp',
    'video/mp4','video/webm',
    'audio/mpeg','audio/ogg','audio/wav',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv','text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload chat attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

-- Allow public read access (needed for WhatsApp to fetch the media)
CREATE POLICY "Public read access for chat attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-attachments');
