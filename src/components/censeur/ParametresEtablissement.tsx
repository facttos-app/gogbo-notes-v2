import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../lib/storage';
import { Settings, Save, CheckCircle2, AlertCircle, Building2, MapPin, Calendar, Award, ShieldCheck, Download, Copy, Check } from 'lucide-react';
import { telechargerSauvegardeIntegrale, collecterSauvegardeIntegrale } from '../../lib/sauvegarde';

export const ParametresEtablissement: React.FC = () => {
  const { currentUser, isCenseur } = useAuth();
  const [params, setParams] = useState(storage.getParametres());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [nom, setNom] = useState(params.nom_etablissement);
  const [ministere, setMinistere] = useState(params.ministere);
  const [titre, setTitre] = useState(params.titre_plateforme);
  const [annee, setAnnee] = useState(params.annee_academique);
  const [commune, setCommune] = useState(params.commune);
  const [arrondissement, setArrondissement] = useState(params.arrondissement);
  const [directeur, setDirecteur] = useState(params.directeur_nom);
  const [censeur, setCenseur] = useState(params.censeur_nom);
  const [devise, setDevise] = useState(params.devise);
  const [email, setEmail] = useState(params.contact_email);
  const [tel, setTel] = useState(params.contact_tel);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSuccessMessage(null);

    const updated = storage.updateParametres(
      {
        nom_etablissement: nom,
        ministere,
        titre_plateforme: titre,
        annee_academique: annee,
        commune,
        arrondissement,
        directeur_nom: directeur,
        censeur_nom: censeur,
        devise,
        contact_email: email,
        contact_tel: tel,
      },
      currentUser
    );

    setParams(updated);
    setSuccessMessage('Paramètres officiels de l’établissement enregistrés avec succès.');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <Settings className="w-6 h-6 text-emerald-700" />
            <span>Paramètres Officiels de l'Établissement</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Identité ministérielle, localisation géographique, direction et année académique
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Formulaire */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6">
        <form onSubmit={handleSave} className="space-y-5 text-xs sm:text-sm">
          {/* Section Institutionnelle */}
          <div className="border-b border-slate-200 pb-4">
            <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Tutelle & Dénomination Officielle</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-semibold mb-1">Ministère de Tutelle</label>
                <input
                  type="text"
                  disabled={!isCenseur}
                  value={ministere}
                  onChange={(e) => setMinistere(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nom de l'Établissement</label>
                <input
                  type="text"
                  disabled={!isCenseur}
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Titre de la Plateforme</label>
                <input
                  type="text"
                  disabled={!isCenseur}
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section Localisation & Année */}
          <div className="border-b border-slate-200 pb-4">
            <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Localisation & Année Académique</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Commune</label>
                <input
                  type="text"
                  disabled={!isCenseur}
                  value={commune}
                  onChange={(e) => setCommune(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Arrondissement</label>
                <input
                  type="text"
                  disabled={!isCenseur}
                  value={arrondissement}
                  onChange={(e) => setArrondissement(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Année Académique</label>
                <input
                  type="text"
                  disabled={!isCenseur}
                  value={annee}
                  onChange={(e) => setAnnee(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-xs text-emerald-800"
                />
              </div>
            </div>
          </div>

          {/* Direction */}
          <div className="border-b border-slate-200 pb-4">
            <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center space-x-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Responsables de Direction</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Directeur Général</label>
                <input
                  type="text"
                  disabled={!isCenseur}
                  value={directeur}
                  onChange={(e) => setDirecteur(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Censeur des Études</label>
                <input
                  type="text"
                  disabled={!isCenseur}
                  value={censeur}
                  onChange={(e) => setCenseur(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {isCenseur && (
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer les paramètres officiels</span>
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Section Gestion Pluriannuelle & Ouverture de Nouvelle Année */}
      <NouvelleAnneeSection />

      {/* Section Sauvegarde Intégrale des Données Réelles */}
      <SauvegardeIntegraleSection />
    </div>
  );
};

const NouvelleAnneeSection: React.FC = () => {
  const { currentUser, isCenseur, isDirecteur } = useAuth();
  const [annees, setAnnees] = useState(storage.getAnneesScolaires());
  const [libelle, setLibelle] = useState('2027–2028');
  const [dateDebut, setDateDebut] = useState('2027-09-13');
  const [dateFin, setDateFin] = useState('2028-06-30');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isCenseur && !isDirecteur) return null;

  const handleCreer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setMsg(null);
    try {
      const created = storage.createAnneeScolaire({ libelle, date_debut: dateDebut, date_fin: dateFin }, currentUser);
      setAnnees(storage.getAnneesScolaires());
      setMsg({ type: 'success', text: `✓ Année scolaire ${created.libelle} créée avec succès. Les trimestres et semestres correspondants ont été automatiquement générés.` });
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur lors de la création.' });
    }
  };

  const handleActiver = (anneeId: string) => {
    if (!currentUser) return;
    setMsg(null);
    try {
      const act = storage.setActiveAnneeScolaire(anneeId, currentUser);
      setAnnees(storage.getAnneesScolaires());
      setMsg({ type: 'success', text: `✓ Année scolaire active basculée sur : ${act.libelle}. L'année précédente est désormais clôturée et archivée.` });
    } catch (err: unknown) {
      setMsg({ type: 'error', text: err instanceof Error ? err.message : 'Erreur lors de l’activation.' });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
        <Calendar className="w-5 h-5 text-emerald-700" />
        <div>
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
            Architecture Pluriannuelle — Registre des Années Scolaires
          </h3>
          <p className="text-xs text-slate-500">
            Ouverture de nouveaux espaces scolaires annuels (2026–2027, 2027–2028, etc.) sans jamais écraser l'historique
          </p>
        </div>
      </div>

      {msg && (
        <div className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Liste des années existantes */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Années scolaires enregistrées :
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {annees.map((a) => (
            <div
              key={a.id}
              className={`p-3 rounded-lg border text-xs flex flex-col justify-between space-y-2 ${
                a.is_active
                  ? 'bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-400'
                  : a.statut === 'CLOTUREE'
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-blue-50/50 border-blue-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 text-sm">{a.libelle}</span>
                  {a.is_active ? (
                    <span className="bg-emerald-600 text-white font-bold text-[9px] px-1.5 py-0.5 rounded uppercase">
                      Active
                    </span>
                  ) : a.statut === 'CLOTUREE' ? (
                    <span className="bg-slate-200 text-slate-700 font-medium text-[9px] px-1.5 py-0.5 rounded uppercase">
                      Clôturée
                    </span>
                  ) : (
                    <span className="bg-blue-200 text-blue-800 font-medium text-[9px] px-1.5 py-0.5 rounded uppercase">
                      À venir
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Du {a.date_debut} au {a.date_fin}
                </p>
              </div>

              {!a.is_active && (
                <button
                  type="button"
                  onClick={() => handleActiver(a.id)}
                  className="w-full text-center py-1 px-2 rounded bg-slate-800 hover:bg-slate-900 text-white font-semibold text-[10px] transition-colors cursor-pointer"
                >
                  Définir comme année en cours
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Formulaire de création d'une nouvelle année */}
      <form onSubmit={handleCreer} className="pt-4 border-t border-slate-200 space-y-3">
        <div className="font-semibold text-xs text-slate-800">
          Ouvrir une nouvelle année scolaire :
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-slate-600 font-medium mb-1">Libellé (ex: 2027–2028)</label>
            <input
              type="text"
              required
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-medium mb-1">Date de début</label>
            <input
              type="date"
              required
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-slate-600 font-medium mb-1">Date de fin</label>
            <input
              type="date"
              required
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
            />
          </div>
        </div>
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            + Initialiser cette année scolaire
          </button>
        </div>
      </form>
    </div>
  );
};

const SauvegardeIntegraleSection: React.FC = () => {
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<{ filename: string; sha256: string; totalEnregistrements: number; sizeKo: number; anneeActive: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await telechargerSauvegardeIntegrale();
      setResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopy = (hash: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
        <ShieldCheck className="w-5 h-5 text-emerald-700" />
        <div>
          <h3 className="font-bold text-slate-900 text-sm sm:text-base">
            Sauvegarde Intégrale des Données Réelles & Sécurisation Locale
          </h3>
          <p className="text-xs text-slate-500">
            Export JSON complet (brut et métier) des données de ce navigateur sans aucune altération de l'existant
          </p>
        </div>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 space-y-1">
        <div className="font-bold flex items-center space-x-1.5 text-emerald-950">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Opération certifiée 100% passive et non-destructive</span>
        </div>
        <p className="text-[11px] text-emerald-800">
          Le téléchargement extrait la totalité des tables (élèves, comptes, notes, affectations, punitions, présences) et calcule une empreinte cryptographique SHA-256. Aucune donnée n'est modifiée ou réinitialisée.
        </p>
      </div>

      {result && (
        <div className="bg-slate-900 text-white rounded-lg p-3 text-xs space-y-1.5 font-mono">
          <div className="text-emerald-400 font-bold flex items-center space-x-1 font-sans">
            <CheckCircle2 className="w-4 h-4" />
            <span>Archive téléchargée avec succès ({result.sizeKo} Ko)</span>
          </div>
          <div className="text-[11px] text-slate-300">Fichier : {result.filename}</div>
          <div className="text-[11px] text-slate-300">Enregistrements : {result.totalEnregistrements}</div>
          <div className="flex items-center space-x-2 text-[10px] text-emerald-300 break-all pt-1 border-t border-slate-800">
            <span>SHA-256 : {result.sha256}</span>
            <button
              type="button"
              onClick={() => handleCopy(result.sha256)}
              className="text-xs text-slate-400 hover:text-white shrink-0 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-2 cursor-pointer shadow-xs disabled:opacity-60"
        >
          <Download className="w-4 h-4" />
          <span>{downloading ? 'Génération en cours...' : 'Télécharger la Sauvegarde Complète (JSON)'}</span>
        </button>
      </div>
    </div>
  );
};

