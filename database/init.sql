-- 1. Create admin_users table
CREATE TABLE public.admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to read admin list (to check their own status)
CREATE POLICY "Allow authenticated read admin_users" ON public.admin_users
    FOR SELECT TO authenticated USING (true);

-- No insert/update/delete policies for client -> Admin must be managed via Supabase Dashboard


-- 2. Create porpor5_documents table
CREATE TABLE public.porpor5_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    academic_year TEXT NOT NULL,
    semester TEXT NOT NULL,
    subject_code TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    grade_level TEXT NOT NULL,
    room TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    drive_file_id TEXT NOT NULL,
    drive_file_url TEXT NOT NULL,
    uploader_uid UUID REFERENCES auth.users(id) NOT NULL,
    uploader_email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for porpor5_documents
ALTER TABLE public.porpor5_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can view all documents
CREATE POLICY "Admin can view all documents" ON public.porpor5_documents
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE email = auth.jwt()->>'email'));

-- Policy: User can view only their own documents
CREATE POLICY "User can view own documents" ON public.porpor5_documents
    FOR SELECT TO authenticated
    USING (uploader_uid = auth.uid());

-- Policy: Authenticated users can insert their own documents
CREATE POLICY "User can insert own documents" ON public.porpor5_documents
    FOR INSERT TO authenticated
    WITH CHECK (uploader_uid = auth.uid());

-- Policy: Admin can update all documents
CREATE POLICY "Admin can update all documents" ON public.porpor5_documents
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE email = auth.jwt()->>'email'));

-- Policy: User can update their own documents
CREATE POLICY "User can update own documents" ON public.porpor5_documents
    FOR UPDATE TO authenticated
    USING (uploader_uid = auth.uid());

-- Policy: Admin can delete all documents
CREATE POLICY "Admin can delete all documents" ON public.porpor5_documents
    FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE email = auth.jwt()->>'email'));

-- Policy: User can delete their own documents
CREATE POLICY "User can delete own documents" ON public.porpor5_documents
    FOR DELETE TO authenticated
    USING (uploader_uid = auth.uid());


-- 3. Create function and trigger for auto-updating updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER porpor5_documents_updated_at
    BEFORE UPDATE ON public.porpor5_documents
    FOR EACH ROW
    EXECUTE PROCEDURE public.handle_updated_at();
