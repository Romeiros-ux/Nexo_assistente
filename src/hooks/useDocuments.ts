import { useState } from "react";
import { Document } from "@/types/document";

// Sample documents for demo
const SAMPLE_DOCUMENTS: Document[] = [
  {
    id: "1",
    name: "Relatório IDEB 2023 - Rede Municipal.pdf",
    type: "pdf",
    size: 2457600,
    uploadedAt: new Date("2024-01-15"),
    status: "active",
    version: "2.1",
    isOfficial: true,
    category: "Indicadores Educacionais",
  },
  {
    id: "2",
    name: "Censo Escolar 2023.xlsx",
    type: "xlsx",
    size: 1843200,
    uploadedAt: new Date("2024-01-10"),
    status: "active",
    version: "1.0",
    isOfficial: true,
    category: "Indicadores Educacionais",
  },
  {
    id: "3",
    name: "Diagnóstico Infraestrutura Escolar.pdf",
    type: "pdf",
    size: 5242880,
    uploadedAt: new Date("2023-12-20"),
    status: "active",
    version: "1.2",
    isOfficial: false,
    category: "Infraestrutura",
  },
  {
    id: "4",
    name: "Plano Municipal de Educação 2024-2034.docx",
    type: "docx",
    size: 1024000,
    uploadedAt: new Date("2024-01-20"),
    status: "active",
    version: "3.0",
    isOfficial: true,
    category: "Planos e Projetos",
  },
  {
    id: "5",
    name: "Taxa de Evasão por Escola.csv",
    type: "csv",
    size: 256000,
    uploadedAt: new Date("2024-01-18"),
    status: "active",
    version: "1.0",
    isOfficial: false,
    category: "Indicadores Educacionais",
  },
  {
    id: "6",
    name: "Orçamento Educação 2024.xlsx",
    type: "xlsx",
    size: 512000,
    uploadedAt: new Date("2024-01-05"),
    status: "inactive",
    version: "1.0",
    isOfficial: false,
    category: "Financeiro",
  },
];

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>(SAMPLE_DOCUMENTS);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>(["1", "2"]);

  const toggleDocument = (id: string) => {
    setSelectedDocuments(prev => 
      prev.includes(id) 
        ? prev.filter(docId => docId !== id)
        : [...prev, id]
    );
  };

  const addDocument = (file: File, options: { category: string; isOfficial: boolean; version: string }) => {
    const newDoc: Document = {
      id: Date.now().toString(),
      name: file.name,
      type: file.name.split('.').pop() as Document['type'],
      size: file.size,
      uploadedAt: new Date(),
      status: "active",
      version: options.version,
      isOfficial: options.isOfficial,
      category: options.category,
    };
    setDocuments(prev => [newDoc, ...prev]);
    setSelectedDocuments(prev => [...prev, newDoc.id]);
  };

  const getSelectedDocumentNames = () => {
    return documents
      .filter(doc => selectedDocuments.includes(doc.id))
      .map(doc => doc.name);
  };

  return {
    documents,
    selectedDocuments,
    toggleDocument,
    addDocument,
    getSelectedDocumentNames,
  };
}
