import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

// --- Ícones SVG para a UI ---
const UploadIcon = () => (
  <svg className="w-12 h-12 mx-auto text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FileIcon = ({ extension }) => (
  <div className="w-10 h-10 bg-gray-200 rounded-md flex items-center justify-center">
    <span className="text-xs font-bold text-gray-600">{extension}</span>
  </div>
);

// --- Componente de Upload ---
const UploadComponent = ({ onFilesAccepted }) => {
  const onDrop = useCallback(acceptedFiles => {
    onFilesAccepted(acceptedFiles);
  }, [onFilesAccepted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: 'image/*'
  });

  return (
    <div {...getRootProps()} className={`w-full max-w-2xl mx-auto bg-white rounded-xl shadow-lg transition-all duration-300 hover:shadow-2xl ${isDragActive ? 'border-blue-500' : 'border-gray-300'} border-2 border-dashed cursor-pointer p-8 text-center`}>
      <input {...getInputProps()} />
      <UploadIcon />
      <p className="mt-4 text-lg font-semibold text-gray-700">
        {isDragActive ? 'Solte os arquivos aqui...' : 'Arraste e solte suas imagens aqui, ou clique para selecionar'}
      </p>
      <p className="mt-1 text-sm text-gray-500">Converta para WebP, PNG, ou JPG facilmente.</p>
    </div>
  );
};


// --- Componente Principal da Aplicação ---
export default function App() {
  const [files, setFiles] = useState([]);
  const [appState, setAppState] = useState('upload'); // upload, managing, converted

  const handleFilesAccepted = (acceptedFiles) => {
    const newFiles = acceptedFiles.map((file, index) => ({
      id: `${file.name}-${file.lastModified}-${index}`,
      originalFile: file,
      originalName: file.name,
      originalType: file.type.split('/')[1],
      targetType: 'webp', // Default
      status: 'pending', // pending, converting, converted, error
      convertedFile: null,
    }));
    setFiles(newFiles);
    setAppState('managing');
  };

  const handleTargetTypeChange = (id, newType) => {
    setFiles(files.map(file => file.id === id ? { ...file, targetType: newType } : file));
  };

  const handleApplyToAll = (newType) => {
    setFiles(files.map(file => ({ ...file, targetType: newType })));
  };

  const handleConvert = async () => {
    setFiles(files.map(f => ({ ...f, status: 'converting' })));

    const conversionPromises = files.map(async (file) => {
      try {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          mimeType: `image/${file.targetType}`,
        };
        const compressedFile = await imageCompression(file.originalFile, options);
        
        const newName = `${file.originalName.substring(0, file.originalName.lastIndexOf('.'))}.${file.targetType}`;
        const finalFile = new File([compressedFile], newName, { type: `image/${file.targetType}` });

        return { ...file, status: 'converted', convertedFile: finalFile };
      } catch (error) {
        console.error(`Erro ao converter ${file.originalName}:`, error);
        return { ...file, status: 'error' };
      }
    });

    const updatedFiles = await Promise.all(conversionPromises);
    setFiles(updatedFiles);
    setAppState('converted');
  };
  
  const handleDownload = (file) => {
    if (file.convertedFile) {
      saveAs(file.convertedFile);
    }
  };

  const handleDownloadAll = () => {
    const zip = new JSZip();
    files.forEach(file => {
      if (file.status === 'converted' && file.convertedFile) {
        zip.file(file.convertedFile.name, file.convertedFile);
      }
    });

    zip.generateAsync({ type: 'blob' }).then(content => {
      saveAs(content, 'imagens-convertidas.zip');
    });
  };
  
  const handleReset = () => {
    setFiles([]);
    setAppState('upload');
  };

  // --- Renderização ---
  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 flex flex-col items-center py-10 px-4">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-900">Conversor de Imagens</h1>
        <p className="text-lg text-gray-600 mt-2">Rápido, seguro e processado no seu navegador.</p>
      </header>

      <main className="w-full">
        {appState === 'upload' && <UploadComponent onFilesAccepted={handleFilesAccepted} />}

        {(appState === 'managing' || appState === 'converted') && (
          <div className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
            {/* Controles Globais */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 border-b pb-4">
              <div className="flex items-center gap-4">
                <label htmlFor="master-format" className="font-semibold">Aplicar a todos:</label>
                <select 
                  id="master-format"
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  onChange={(e) => handleApplyToAll(e.target.value)}
                >
                  <option value="webp">WebP</option>
                  <option value="png">PNG</option>
                  <option value="jpeg">JPEG</option>
                </select>
              </div>
              {appState === 'converted' ? (
                <div className="flex gap-4 mt-4 md:mt-0">
                  <button onClick={handleDownloadAll} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                    Baixar Todos (.zip)
                  </button>
                  <button onClick={handleReset} className="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors">
                    Começar de Novo
                  </button>
                </div>
              ) : (
                <button onClick={handleConvert} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors mt-4 md:mt-0">
                  Converter {files.length} Arquivo(s)
                </button>
              )}
            </div>

            {/* Lista de Arquivos */}
            <ul className="space-y-4">
              {files.map(file => (
                <li key={file.id} className="flex flex-col md:flex-row items-center justify-between p-4 bg-gray-50 rounded-lg shadow-sm">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <FileIcon extension={file.originalType.toUpperCase()} />
                    <span className="font-medium truncate" title={file.originalName}>{file.originalName}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-4 md:mt-0">
                    {file.status === 'pending' && (
                      <select 
                        value={file.targetType}
                        onChange={(e) => handleTargetTypeChange(file.id, e.target.value)}
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="webp">WebP</option>
                        <option value="png">PNG</option>
                        <option value="jpeg">JPEG</option>
                      </select>
                    )}
                    {file.status === 'converting' && <span className="text-sm font-semibold text-blue-600">Convertendo...</span>}
                    {file.status === 'error' && <span className="text-sm font-semibold text-red-600">Erro!</span>}
                    {file.status === 'converted' && (
                      <>
                        <span className="text-sm font-semibold text-green-600">Convertido para {file.targetType.toUpperCase()}</span>
                        <button onClick={() => handleDownload(file)} className="bg-green-500 text-white font-bold py-1 px-3 rounded-lg hover:bg-green-600 transition-colors">
                          Download
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
