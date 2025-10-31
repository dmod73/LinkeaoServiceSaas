-- Add converted_to_invoice field to invoicing_documents
-- This tracks if an estimate has been converted to an invoice

ALTER TABLE public.invoicing_documents 
ADD COLUMN IF NOT EXISTS converted_to_invoice boolean DEFAULT false;

COMMENT ON COLUMN public.invoicing_documents.converted_to_invoice IS 'Indicates if this estimate has been converted to an invoice';
