import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Download, 
  CheckCircle2, 
  FileCheck, 
  Database, 
  AlertTriangle, 
  X, 
  Copy, 
  Check, 
  HardDrive, 
  Calendar,
  Lock,
  Layers,
  Search,
  Upload
} from 'lucide-react';
import { 
  collecterSauvegardeIntegrale, 
  telechargerSauvegardeIntegrale, 
  verifierFichierSauvegarde,
  SauvegardeIntegralePayload,
  ResultatVerificationSauvegarde 
} from '../../lib/sauvegarde';

interface SauvegardeIntegraleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SauvegardeIntegraleModal: React.FC<SauvegardeIntegraleModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'export' | 'verifier'>('export');
  const [inventaire, setInventaire] = useState<SauvegardeIntegralePayload | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<{
    filename: string;
    sha256: string;
    totalEnregistrements: number;
    sizeKo: number;
    anneeActive: string;
  } | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  // État vérification
  const [verificationResult, setVerificationResult] = useState<ResultatVerificationSauvegarde | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setExportSuccess(null);
      setVerificationResult(null);
      // Collecte passive pour affichage de l'inventaire en direct
      collecterSauvegardeIntegrale().then((res) => {
        setInventaire(res);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const res = await telechargerSauvegardeIntegrale();
      setExportSuccess(res);
    } catch (err) {
      console.error('Erreur lors du téléchargement de la sauvegarde:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyHash = (hash: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handleFileVerification = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsVerifying(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = await verifierFichierSauvegarde(content);
        setVerificationResult(result);
      }
      setIsVerifying(false);
    };
    reader.readAsText(file);
  };

  const statsEntries = inventaire?.metadata.statistiques ? Object.entries(inventaire.metadata.statistiques) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-modal-sauvegarde"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* En-tête */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 id="titre-modal-sauvegarde" className="text-base font-bold text-white leading-tight">
                  Sauvegarde Intégrale des Données Réelles
                </h3>
                <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                  2026–2027
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Système Officiel • CEG GOGBO • Export Conforme sans modification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Onglets navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-2 space-x-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('export')}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center space-x-2 ${
              activeTab === 'export'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Télécharger la Sauvegarde</span>
          </button>
          <button
            onClick={() => setActiveTab('verifier')}
            className={`pb-2.5 px-3 border-b-2 transition-colors cursor-pointer flex items-center space-x-2 ${
              activeTab === 'verifier'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Vérifier un fichier JSON existant</span>
          </button>
        </div>

        {/* Corps principal */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {activeTab === 'export' && (
            <>
              {/* Bannière de garantie stricte */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start space-x-3 text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-emerald-950 text-xs">
                    Garantie d'intégrité et de sécurité absolue
                  </div>
                  <p className="text-[11px] leading-relaxed text-emerald-800">
                    Cette opération est <strong>100% passive et en lecture seule</strong>. Aucune donnée n'est supprimée, modifiée ou réinitialisée. L'année scolaire active reste <strong>2026–2027</strong>. Vos identifiants, élèves, notes et attributions restent strictement intacts.
                  </p>
                </div>
              </div>

              {/* Résumé de l'inventaire détecté */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center space-x-2 font-bold text-slate-800 text-xs">
                    <Database className="w-4 h-4 text-slate-600" />
                    <span>Données Réelles Détectées dans ce Navigateur</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {inventaire?.metadata.total_enregistrements ?? 0} enregistrements réels
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
                  {statsEntries.map(([nom, count]) => (
                    <div 
                      key={nom} 
                      className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between"
                    >
                      <span className="text-slate-600 truncate pr-1" title={nom}>{nom}</span>
                      <span className="font-mono font-bold text-slate-900 shrink-0 bg-slate-100 px-1.5 py-0.5 rounded">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bloc de succès après téléchargement */}
              {exportSuccess && (
                <div className="bg-emerald-900 text-white rounded-xl p-4 space-y-3 border border-emerald-700 shadow-md animate-fade-in">
                  <div className="flex items-center space-x-2 text-emerald-300 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Sauvegarde téléchargée avec succès !</span>
                  </div>

                  <div className="bg-emerald-950/80 rounded-lg p-3 space-y-2 text-[11px] font-mono border border-emerald-800">
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Fichier :</span>
                      <strong className="text-emerald-300 text-xs break-all">{exportSuccess.filename}</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Taille :</span>
                      <strong className="text-emerald-300">{exportSuccess.sizeKo} Ko</strong>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span>Enregistrements :</span>
                      <strong className="text-emerald-300">{exportSuccess.totalEnregistrements}</strong>
                    </div>
                    <div className="pt-2 border-t border-emerald-800/80 flex flex-col space-y-1">
                      <div className="flex justify-between items-center text-slate-300">
                        <span>Empreinte SHA-256 :</span>
                        <button
                          onClick={() => handleCopyHash(exportSuccess.sha256)}
                          className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-200 cursor-pointer"
                        >
                          {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                          <span className="text-[10px]">{copiedHash ? 'Copié !' : 'Copier'}</span>
                        </button>
                      </div>
                      <div className="text-[10px] text-emerald-400 break-all bg-emerald-900/50 p-1.5 rounded">
                        {exportSuccess.sha256}
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-emerald-200 leading-normal">
                    📁 <strong>Conservez ce fichier en lieu sûr sur votre ordinateur.</strong> Ce document contient l'intégralité vérifiable de vos comptes administratifs (y compris vos profils de connexion) et l'ensemble des données pédagogiques 2026–2027.
                  </p>
                </div>
              )}

              {/* Action de téléchargement */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-[11px] text-slate-500 flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Format d'export : JSON Chiffré & Structuré (v1)</span>
                </div>

                <button
                  id="btn-telecharger-sauvegarde-action"
                  onClick={handleDownload}
                  disabled={isExporting}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 text-xs cursor-pointer disabled:opacity-60"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {isExporting ? 'Génération en cours...' : 'Télécharger la Sauvegarde Complète (JSON)'}
                  </span>
                </button>
              </div>
            </>
          )}

          {activeTab === 'verifier' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center space-x-2">
                  <Search className="w-4 h-4 text-slate-600" />
                  <span>Contrôler l'intégrité d'une archive de sauvegarde</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Sélectionnez un fichier JSON de sauvegarde précédemment généré. Le module vérifiera sa conformité de structure, son empreinte cryptographique SHA-256 et détaillera son contenu sans rien modifier dans votre session active.
                </p>

                <div className="mt-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sélectionner le fichier JSON :
                  </label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileVerification}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer border border-slate-200 rounded-lg p-1"
                  />
                </div>
              </div>

              {isVerifying && (
                <div className="text-center py-4 text-slate-500 text-xs">
                  Analyse et calcul de l'empreinte en cours...
                </div>
              )}

              {verificationResult && (
                <div className={`rounded-xl p-4 border space-y-3 ${
                  verificationResult.valide ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    {verificationResult.valide ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={`font-bold text-xs ${
                      verificationResult.valide ? 'text-emerald-900' : 'text-red-900'
                    }`}>
                      {verificationResult.message}
                    </span>
                  </div>

                  {verificationResult.valide && (
                    <div className="space-y-2 text-[11px] text-slate-700">
                      <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-lg border border-slate-200 font-mono">
                        <div>Établissement : <strong>{verificationResult.etablissement}</strong></div>
                        <div>Année active : <strong>{verificationResult.annee_scolaire}</strong></div>
                        <div>Date d'export : <strong>{verificationResult.date_sauvegarde}</strong></div>
                        <div>Enregistrements : <strong>{verificationResult.total_enregistrements}</strong></div>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span>Contrôle de l'Empreinte SHA-256 :</span>
                          <span className={verificationResult.checksum_conforme ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                            {verificationResult.checksum_conforme ? '✓ Conforme (Non altéré)' : 'Empreinte recalculated'}
                          </span>
                        </div>
                        <div className="font-mono text-[10px] text-slate-600 break-all bg-slate-50 p-1 rounded">
                          {verificationResult.empreinte_declaree || verificationResult.empreinte_calculee}
                        </div>
                      </div>

                      {verificationResult.statistiques && (
                        <div>
                          <div className="font-semibold text-slate-800 mb-1.5">
                            Détail du contenu archivé :
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {Object.entries(verificationResult.statistiques).map(([k, v]) => (
                              <div key={k} className="bg-white p-1.5 rounded border border-slate-200 flex justify-between">
                                <span className="truncate pr-1">{k}</span>
                                <strong className="font-mono">{v}</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pied de page */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            CEG GOGBO • Année 2026–2027
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-300 hover:bg-slate-400 text-slate-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
