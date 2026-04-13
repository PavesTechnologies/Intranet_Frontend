import React, { useState } from 'react';
import { exit_documents } from '../data/mockData';
import { FileText, Download, UploadCloud, File, FileSignature, AlertCircle } from 'lucide-react';

export default function DocumentsTab({ exit_uuid }) {
  const [documents] = useState(exit_documents.filter(d => d.exit_uuid === exit_uuid));

  const standardDocs = ['Relieving Letter', 'Experience Letter', 'Full & Final', 'NOC', 'Resignation Letter'];

  const getDocIcon = (type) => {
    if(type.includes('Letter')) return <FileSignature size={28} className="text-indigo-500" />;
    if(type.includes('Final')) return <FileText size={28} className="text-emerald-500" />;
    return <File size={28} className="text-blue-500" />;
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="mb-6 flex justify-between items-end border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Exit Documents</h2>
          <p className="text-gray-500 mt-1">Upload and manage relieving letters, F&F settlements, and NOCs.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-sm transition-colors">
          <UploadCloud size={18} /> Upload Document
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {standardDocs.map(docType => {
          const existingDoc = documents.find(d => d.document_type === docType);
          
          return (
            <div key={docType} className={`border rounded-2xl p-6 transition-all ${
              existingDoc ? 'bg-white border-gray-200 shadow-sm hover:shadow-md' : 'bg-gray-50 border-dashed border-gray-300'
            }`}>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${existingDoc ? 'bg-gray-50 border border-gray-100' : 'bg-gray-200 opacity-50'}`}>
                  {getDocIcon(docType)}
                </div>
                {existingDoc ? (
                  <span className="bg-green-100 text-green-700 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md">
                    Uploaded
                  </span>
                ) : (
                  <span className="bg-amber-100 text-amber-700 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md">
                    Missing
                  </span>
                )}
              </div>
              
              <h3 className={`font-bold mb-1 ${existingDoc ? 'text-gray-900' : 'text-gray-500'}`}>
                {docType}
              </h3>
              
              {existingDoc ? (
                <div>
                  <p className="text-xs text-gray-500 truncate mb-4 font-mono">{existingDoc.file_name}</p>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-white border border-gray-200 text-gray-700 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 shadow-sm">
                      <Download size={14} /> Download
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-gray-400 mb-4 h-4"></p>
                  <button className="w-full bg-white border border-gray-200 text-gray-500 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 border-dashed">
                    <UploadCloud size={14} /> Browse File
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-4 items-start">
        <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="font-semibold text-blue-900 text-sm">Document Generation Available</h4>
          <p className="text-blue-700 text-sm mt-0.5">You can automatically generate Relieving and Experience letters using the Document Templates module once Final Settlement is approved.</p>
        </div>
      </div>
    </div>
  );
}
