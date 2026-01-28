-- Verificar a função match_chunks
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name = 'match_chunks'
  AND routine_schema = 'public';

-- Testar a função diretamente
SELECT * FROM match_chunks(
  (SELECT embedding FROM document_embeddings LIMIT 1),
  0.55,
  10
);
