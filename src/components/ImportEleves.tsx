import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../lib/storage';
import {
  analyserTableau,
  decoderTexte,
  lireXlsx,
  parserCsv,
  type LigneImport,
  type ResultatAnalyse,
  type TableauBrut,
} from '../../lib/importEleves';
import { telechargerXlsx } from '../../lib/exportXlsx';
import { Upload, UserPlus, FileDown, AlertTriangle, CheckCircle2 } from 'lucide-react';

const ENTETES_MODELE = ['Matricule', 'Nom', 'Prénoms', 'Sexe', 'Date de naissance', 'Lieu de naissance'];

const LIBELLES: Record<LigneImport['statut'], { texte: string; classe: string }> = {
  nouveau: { texte: 'À inscrire', classe: 'bg-emerald-100 text-emerald-800' },
  complement: { texte: 'À compléter', classe: 'bg-sky-100 text-sky-800' },
  identique: { texte: 'Déjà à jour', classe: 'bg-slate-100 text-slate-700' },
  erreur: { texte: 'À corriger', classe: 'bg-red-100 text-red-800' },
};

export const ImportEleves: React.FC = () => {
  const { currentUser, isCenseur, isDirecteur } = useAuth();
  const [classeId, setClasseId] = useState<string>('');
  const [texteColle, setTexteColle] = useState<string>('');
  const [nomFichier, setNomFichier] = useState<string>('');
  const [tableau, setTableau] = useState<TableauBrut | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'erreur'; texte: string } | null>(null);
  const [enCours, setEnCours] = useState<boolean>(false);
  const [rapport, setRapport] = useState<string[] | null>(null);
  const [version, setVersion] = useState<number>(0);

  const classes = useMemo(
    () => [...storage.getClasses()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
    []
  );

  const analyse: ResultatAnalyse | null = useMemo(() => {
    if (!tableau || !classeId) return null;
    const elevesExistants = storage.getEleves();
    const effectif = elevesExistants.filter((e) => e.classe_id === classeId && e.statut === 'ACTIF').length;
    return analyserTableau(tableau, { classeId, elevesExistants, effectifActifClasse: effectif });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableau, classeId, version]);

  if (!isCenseur && !isDirecteur) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-700">
        Cet espace est réservé au Censeur et au Directeur Général.
      </div>
    );
  }

  const reinitialiser = () => {
    setTableau(null);
    setNomFichier('');
    setTexteColle('');
    setRapport(null);
    setMessage(null);
  };

  const choisirFichier = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!fichier) return;
    setRapport(null);
    setMessage(null);
    try {
      const octets = new Uint8Array(await fichier.arrayBuffer());
      const nom = fichier.name.toLowerCase();
      let table: TableauBrut;
      if (nom.endsWith('.xlsx')) table = await lireXlsx(octets);
      else if (nom.endsWith('.csv') || nom.endsWith('.txt')) table = parserCsv(decoderTexte(octets));
      else if (nom.endsWith('.xls')) {
        throw new Error('Le format ancien .xls n’est pas pris en charge : enregistrez le fichier en .xlsx ou en .csv.');
      } else throw new Error('Format non pris en charge : utilisez un fichier .xlsx ou .csv.');
      if (table.length === 0) throw new Error('Le fichier ne contient aucune ligne.');
      setNomFichier(fichier.name);
      setTableau(table);
      setVersion((v) => v + 1);
    } catch (err) {
      setTableau(null);
      setNomFichier('');
      setMessage({ type: 'erreur', texte: err instanceof Error ? err.message : 'Lecture du fichier impossible.' });
    }
  };

  const analyserTexteColle = () => {
    setRapport(null);
    setMessage(null);
    const table = parserCsv(texteColle);
    if (table.length === 0) {
      setMessage({ type: 'erreur', texte: 'Collez d’abord les lignes du tableau (une ligne par élève).' });
      return;
    }
    setNomFichier('Texte collé');
    setTableau(table);
    setVersion((v) => v + 1);
  };

  const telechargerModele = () => {
    telechargerXlsx('modele_import_eleves.xlsx', [
      {
        nom: 'Élèves',
        lignes: [ENTETES_MODELE, ['1101000000001', 'NOM', 'Prénoms', 'M', '15/03/2012', 'Adjohoun']],
        largeurs: [18, 22, 28, 8, 18, 22],
      },
    ]);
  };

  const inscrire = async () => {
    if (!analyse || !currentUser || enCours) return;
    const classe = classes.find((c) => c.id === classeId);
    const aInscrire = analyse.lignes.filter((l) => l.statut === 'nouveau');
    const aCompleter = analyse.lignes.filter((l) => l.statut === 'complement');
    if (aInscrire.length + aCompleter.length === 0) return;
    if (
      !window.confirm(
        `Inscrire ${aInscrire.length} élève(s) et compléter ${aCompleter.length} fiche(s) en ${classe?.nom || 'cette classe'} ?`
      )
    ) {
      return;
    }
    setEnCours(true);
    setMessage(null);
    const echecs: string[] = [];
    const erreursBase: string[] = [];
    const ecouteur = (ev: Event) => {
      const detail = (ev as CustomEvent<{ table: string; message: string }>).detail;
      if (detail) erreursBase.push(`${detail.table} : ${detail.message}`);
    };
    window.addEventListener('gogbo-sync-error', ecouteur);
    let inscrits = 0;
    let completes = 0;
    try {
      for (const l of aInscrire) {
        try {
          storage.createEleve(
            {
              matricule: l.matricule,
              nom: l.nom,
              prenom: l.prenom,
              sexe: l.sexe as 'M' | 'F',
              date_naissance: l.date_naissance,
              lieu_naissance: l.lieu_naissance || undefined,
              classe_id: classeId,
              langue_vivante_2: 'AUCUNE',
              statut: 'ACTIF',
            },
            currentUser
          );
          inscrits += 1;
        } catch (err) {
          echecs.push(`Ligne ${l.numero} (${l.nom} ${l.prenom}) : ${err instanceof Error ? err.message : 'échec'}`);
        }
      }
      for (const l of aCompleter) {
        try {
          storage.updateEleve(l.eleveExistantId as string, { ...l.completer }, currentUser);
          completes += 1;
        } catch (err) {
          echecs.push(`Ligne ${l.numero} (${l.nom} ${l.prenom}) : ${err instanceof Error ? err.message : 'échec'}`);
        }
      }
      await storage.attendreSynchronisation();
    } finally {
      window.removeEventListener('gogbo-sync-error', ecouteur);
      setEnCours(false);
    }
    const lignes: string[] = [`${inscrits} élève(s) inscrit(s), ${completes} fiche(s) complétée(s).`];
    if (echecs.length > 0) lignes.push(`${echecs.length} ligne(s) refusée(s) :`, ...echecs.slice(0, 10));
    if (erreursBase.length > 0) {
      lignes.push(
        `Attention : ${erreursBase.length} enregistrement(s) refusé(s) par la base centrale :`,
        ...Array.from(new Set(erreursBase)).slice(0, 3)
      );
    }
    setRapport(lignes);
    setMessage({
      type: echecs.length === 0 && erreursBase.length === 0 ? 'ok' : 'erreur',
      texte:
        echecs.length === 0 && erreursBase.length === 0
          ? 'Import terminé et enregistré dans la base centrale.'
          : 'Import terminé avec des problèmes : voir le détail ci-dessous.',
    });
    setTableau(null);
    setNomFichier('');
    setTexteColle('');
    setVersion((v) => v + 1);
  };

  const nbAFaire = analyse ? analyse.nouveaux + analyse.complements : 0;

  return (
    <div className="space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center space-x-2 mb-1">
          <UserPlus className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-black text-slate-900">Inscrire des élèves depuis un fichier</h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Fichier Excel (.xlsx) ou CSV avec les colonnes : <strong>Matricule, Nom, Prénoms, Sexe (M ou F), Date de
          naissance, Lieu de naissance</strong>. Une classe à la fois. Vous vérifiez l’aperçu avant toute inscription.
          Un élève déjà inscrit (même matricule et même nom) n’est jamais dupliqué : seules ses informations
          manquantes (date ou lieu de naissance) sont complétées.
        </p>
        <button
          type="button"
          onClick={telechargerModele}
          className="mt-3 inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-700 border border-emerald-300 rounded-lg px-3 py-2"
        >
          <FileDown className="w-3.5 h-3.5" />
          <span>Télécharger un modèle Excel</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <label htmlFor="import-classe" className="block text-xs font-bold text-slate-700 mb-1.5">
            1. Classe d’inscription
          </label>
          <select
            id="import-classe"
            value={classeId}
            onChange={(e) => setClasseId(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white"
          >
            <option value="">Choisir la classe…</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">2. Fichier de la liste</label>
          <label
            htmlFor="import-fichier"
            className={`flex items-center justify-center space-x-2 border-2 border-dashed rounded-xl px-4 py-5 text-sm font-semibold cursor-pointer ${
              classeId ? 'border-emerald-400 text-emerald-700' : 'border-slate-300 text-slate-400'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>{nomFichier || 'Choisir un fichier .xlsx ou .csv'}</span>
          </label>
          <input
            id="import-fichier"
            type="file"
            accept=".xlsx,.csv,.txt"
            disabled={!classeId}
            onChange={choisirFichier}
            className="hidden"
          />
        </div>

        <details className="text-xs text-slate-700">
          <summary className="cursor-pointer font-bold">Ou coller le tableau (depuis Excel, Google Sheets…)</summary>
          <textarea
            value={texteColle}
            onChange={(e) => setTexteColle(e.target.value)}
            rows={5}
            placeholder={'Matricule;Nom;Prénoms;Sexe;Date de naissance;Lieu de naissance'}
            className="mt-2 w-full border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900"
          />
          <button
            type="button"
            disabled={!classeId || !texteColle.trim()}
            onClick={analyserTexteColle}
            className="mt-2 px-3 py-2 rounded-lg text-xs font-bold bg-slate-800 text-white disabled:bg-slate-300"
          >
            Analyser le texte collé
          </button>
        </details>
      </div>

      {message && (
        <div
          className={`rounded-2xl p-4 text-xs flex items-start space-x-2 border ${
            message.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {message.type === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          <span>{message.texte}</span>
        </div>
      )}

      {rapport && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs text-slate-800 space-y-1">
          {rapport.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      )}

      {analyse && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="text-xs text-slate-700">
            {analyse.lignes.length} ligne(s) lue(s)
            {analyse.entetesDetectes ? '' : ' (aucun en-tête reconnu : ordre Matricule, Nom, Prénoms, Sexe, Date, Lieu)'} :{' '}
            <strong className="text-emerald-700">{analyse.nouveaux} à inscrire</strong>,{' '}
            <strong className="text-sky-700">{analyse.complements} à compléter</strong>, {analyse.identiques} déjà à
            jour, <strong className={analyse.erreurs > 0 ? 'text-red-700' : ''}>{analyse.erreurs} à corriger</strong>.
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200">
                  <th className="py-1.5 pr-2 font-bold">L.</th>
                  <th className="py-1.5 pr-2 font-bold">État</th>
                  <th className="py-1.5 pr-2 font-bold">Matricule</th>
                  <th className="py-1.5 pr-2 font-bold">Nom</th>
                  <th className="py-1.5 pr-2 font-bold">Prénoms</th>
                  <th className="py-1.5 pr-2 font-bold">Sexe</th>
                  <th className="py-1.5 pr-2 font-bold">Naissance</th>
                  <th className="py-1.5 pr-2 font-bold">Lieu</th>
                  <th className="py-1.5 font-bold">Remarques</th>
                </tr>
              </thead>
              <tbody>
                {analyse.lignes.map((l) => (
                  <tr key={l.numero} className="border-b border-slate-100 text-slate-800 align-top">
                    <td className="py-1.5 pr-2">{l.numero}</td>
                    <td className="py-1.5 pr-2">
                      <span className={`px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${LIBELLES[l.statut].classe}`}>
                        {LIBELLES[l.statut].texte}
                      </span>
                    </td>
                    <td className="py-1.5 pr-2 font-mono">{l.matricule}</td>
                    <td className="py-1.5 pr-2 font-semibold">{l.nom}</td>
                    <td className="py-1.5 pr-2">{l.prenom}</td>
                    <td className="py-1.5 pr-2">{l.sexe || '—'}</td>
                    <td className="py-1.5 pr-2 whitespace-nowrap">{l.date_naissance || '—'}</td>
                    <td className="py-1.5 pr-2">{l.lieu_naissance || '—'}</td>
                    <td className="py-1.5 text-[11px]">
                      {[...l.erreurs, ...l.avertissements].map((r, i) => (
                        <div key={i} className={l.erreurs.includes(r) ? 'text-red-700' : 'text-amber-700'}>
                          {r}
                        </div>
                      ))}
                      {l.completer && (
                        <div className="text-sky-700">
                          Sera complété : {Object.keys(l.completer).map((k) => (k === 'lieu_naissance' ? 'lieu' : 'date')).join(', ')}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex space-x-2">
            <button
              id="btn-import-eleves"
              type="button"
              onClick={inscrire}
              disabled={nbAFaire === 0 || enCours}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold text-sm px-4 py-3 rounded-xl transition-colors"
            >
              {enCours
                ? 'Enregistrement en cours…'
                : `Inscrire ${analyse.nouveaux} élève(s)${analyse.complements > 0 ? ` et compléter ${analyse.complements} fiche(s)` : ''}`}
            </button>
            <button
              type="button"
              onClick={reinitialiser}
              disabled={enCours}
              className="px-4 py-3 rounded-xl border border-slate-300 text-slate-700 text-sm font-bold"
            >
              Annuler
            </button>
          </div>
          {analyse.erreurs > 0 && (
            <div className="text-[11px] text-slate-600">
              Les lignes « À corriger » ne seront pas inscrites. Corrigez le fichier puis rechargez-le : les élèves déjà
              inscrits ne seront pas dupliqués.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
