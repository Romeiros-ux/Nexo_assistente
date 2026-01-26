-- Adiciona coluna para contar arquivos anexados baixados de links
ALTER TABLE public.documents
ADD COLUMN attached_files_count integer NOT NULL DEFAULT 0;

-- Comentário explicativo
COMMENT ON COLUMN public.documents.attached_files_count IS 'Número de arquivos anexados baixados quando source_type é link';