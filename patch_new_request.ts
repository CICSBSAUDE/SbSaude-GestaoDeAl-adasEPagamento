import * as fs from 'fs';

let content = fs.readFileSync('src/components/NewRequestForm.tsx', 'utf-8');

// Add useRef
content = content.replace('useState, useEffect } from \'react\'', 'useState, useEffect, useRef } from \'react\'');

// Replace handleAddSampleDocument and add new state
const handleAddReplace = `
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadType, setPendingUploadType] = useState<string | null>(null);

  const triggerFileUpload = (tipo: string) => {
    setPendingUploadType(tipo);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const generateSHA256 = async (file: File): Promise<string> => {
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (e) {
      console.warn("Failed to generate real SHA-256, falling back to simulated hash.", e);
      return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingUploadType) return;

    // Reset input
    e.target.value = '';

    // Validate size (25MB)
    const MAX_SIZE = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert('O arquivo excede o limite máximo de 25MB.');
      return;
    }

    // Validate type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Apenas arquivos PDF são permitidos.');
      return;
    }

    const hashSha256 = await generateSHA256(file);
    
    // In a real application, you would upload to a bucket (e.g. Firebase Storage)
    // For this mockup, we'll create a local object URL or a simulated URL
    const url = URL.createObjectURL(file);

    const newDoc = {
      id: \`doc-\${Date.now()}\`,
      tipo: pendingUploadType,
      nomeArquivo: file.name,
      tamanhoBytes: file.size,
      mimeType: file.type || 'application/pdf',
      url,
      hashSha256,
      uploadedBy: {
        id: currentUser?.id,
        name: currentUser?.name,
        email: currentUser?.email,
      },
      uploadedAt: new Date().toISOString(),
    };

    setDocumentos((prev) => [...prev, newDoc]);
    setPendingUploadType(null);
  };
`;

content = content.replace(/const handleAddSampleDocument = \(tipo: string\) => \{[\s\S]*?setDocumentos\(\(prev\) => \[\.\.\.prev, newDoc\]\);\n  \};/, handleAddReplace);

// Replace button onClick handlers
content = content.replace(/onClick=\{\(\) => handleAddSampleDocument\('NOTA_FISCAL'\)\}/g, "onClick={() => triggerFileUpload('NOTA_FISCAL')}");
content = content.replace(/onClick=\{\(\) => handleAddSampleDocument\('COTACAO_PRECOS'\)\}/g, "onClick={() => triggerFileUpload('COTACAO_PRECOS')}");
content = content.replace(/onClick=\{\(\) => handleAddSampleDocument\('CONTRATO'\)\}/g, "onClick={() => triggerFileUpload('CONTRATO')}");
content = content.replace(/onClick=\{\(\) => handleAddSampleDocument\('BOLETO_BANCARIO'\)\}/g, "onClick={() => triggerFileUpload('BOLETO_BANCARIO')}");

// Add hidden file input next to the buttons
const hiddenInput = `
          <div className="flex flex-wrap gap-2">
            <input 
              type="file" 
              accept="application/pdf" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileSelected} 
            />
`;

content = content.replace(/<div className="flex flex-wrap gap-2">/g, hiddenInput);

fs.writeFileSync('src/components/NewRequestForm.tsx', content);
