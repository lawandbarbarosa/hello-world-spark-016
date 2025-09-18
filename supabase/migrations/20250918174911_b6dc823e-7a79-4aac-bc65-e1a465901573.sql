-- Create storage bucket for CSV file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('csv-uploads', 'csv-uploads', false);

-- Create RLS policies for CSV uploads bucket
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