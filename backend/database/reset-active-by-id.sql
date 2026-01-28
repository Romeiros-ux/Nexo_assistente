-- Resetar os 3 documentos ACTIVE usando IDs (evita problemas com encoding de caracteres)
UPDATE documents
SET status = 'PENDING', updated_at = NOW()
WHERE id IN (
    '7f72fc97-8144-4785-adc5-623484643a39',  -- Lei Ordinária 2232/2022
    'c05a3334-e3ad-45e6-a3f8-a8ba35d66cdc',  -- Lei Ordinária 2667/2024
    '2240f091-4637-4562-a7c1-89516846a6fa'   -- Plano Municipal De Educação - Saquarema
);

-- Verificar resultado
SELECT status, name FROM documents ORDER BY status DESC, name;
