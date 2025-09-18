-- Create RLS policies for CSV uploads bucket (bucket already exists)
CREATE POLICY "Users can upload their own CSV files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'csv-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own CSV files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'csv-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own CSV files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'csv-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own CSV files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'csv-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);