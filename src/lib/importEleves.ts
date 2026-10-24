// Import d'une liste d'élèves (Excel .xlsx, CSV ou texte collé) : lecture, analyse et vérifications.
// Fonctions sans accès à la base : elles produisent un aperçu que le Censeur valide avant l'inscription.
import type { Eleve } from '../types';

export type TableauBrut = string[][];

// ---------------------------------------------------------------- Lecture CSV / texte collé
export function detecterSeparateur(texte: string): string {
  const premiere = texte.split(/\r?\n/).find((l) => l.trim().length > 0) || '';
  const comptes: Record<string, number> = { '\t': 0, ';': 0, ',': 0 };
  let dansGuillemets = false;
  for (const ch of premiere) {
    if (ch === '"') dansGuillemets = !dansGuillemets;
    else if (!dansGuillemets && ch in comptes) comptes[ch] += 1;
  }
  const meilleur = Object.entries(comptes).sort((a, b) => b[1] - a[1])[0];
  return meilleur[1] > 0 ? meilleur[0] : ';';
}

export function parserCsv(texteBrut: string): TableauBrut {
  const texte = texteBrut.replace(/^\uFEFF/, '');
  const sep = detecterSeparateur(texte);
  const lignes: TableauBrut = [];
  let ligne: string[] = [];
  let champ = '';
  let dansGuillemets = false;
  for (let i = 0; i < texte.length; i++) {
    const ch = texte[i];
    if (dansGuillemets) {
      if (ch === '"') {
        if (texte[i + 1] === '"') {
          champ += '"';
          i += 1;
        } else dansGuillemets = false;
      } else champ += ch;
    } else if (ch === '"') {
      dansGuillemets = true;
    } else if (ch === sep) {
      ligne.push(champ);
      champ = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && texte[i + 1] === '\n') i += 1;
      ligne.push(champ);
      champ = '';
      lignes.push(ligne);
      ligne = [];
    } else champ += ch;
  }
  if (champ.length > 0 || ligne.length > 0) {
    ligne.push(champ);
    lignes.push(ligne);
  }
  return lignes.filter((l) => l.some((c) => c.trim() !== '')).map((l) => l.map((c) => c.trim()));
}

export function decoderTexte(octets: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(octets);
  } catch {
    return new TextDecoder('windows-1252').decode(octets);
  }
}

// ---------------------------------------------------------------- Lecture Excel (.xlsx)
async function decompresser(donnees: Uint8Array): Promise<Uint8Array> {
  const flux = new Blob([donnees as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(flux).arrayBuffer());
}

async function lireZip(octets: Uint8Array): Promise<Map<string, Uint8Array>> {
  const vue = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
  let fin = -1;
  for (let i = octets.length - 22; i >= Math.max(0, octets.length - 70000); i--) {
    if (vue.getUint32(i, true) === 0x06054b50) {
      fin = i;
      break;
    }
  }
  if (fin < 0) throw new Error("Ce fichier n'est pas un classeur Excel (.xlsx) valide.");
  const nbEntrees = vue.getUint16(fin + 10, true);
  let pos = vue.getUint32(fin + 16, true);
  const fichiers = new Map<string, Uint8Array>();
  const decodeur = new TextDecoder('utf-8');
  for (let n = 0; n < nbEntrees; n++) {
    if (vue.getUint32(pos, true) !== 0x02014b50) break;
    const methode = vue.getUint16(pos + 10, true);
    const tailleCompressee = vue.getUint32(pos + 20, true);
    const tailleNom = vue.getUint16(pos + 28, true);
    const tailleExtra = vue.getUint16(pos + 30, true);
    const tailleCommentaire = vue.getUint16(pos + 32, true);
    const offsetLocal = vue.getUint32(pos + 42, true);
    const nom = decodeur.decode(octets.subarray(pos + 46, pos + 46 + tailleNom));
    const debutDonnees = offsetLocal + 30 + vue.getUint16(offsetLocal + 26, true) + vue.getUint16(offsetLocal + 28, true);
    const brut = octets.subarray(debutDonnees, debutDonnees + tailleCompressee);
    if (/^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(nom)) {
      fichiers.set(nom, methode === 0 ? brut : await decompresser(brut));
    }
    pos += 46 + tailleNom + tailleExtra + tailleCommentaire;
  }
  return fichiers;
}

function decoderXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&');
}

function textesBalises(xml: string): string {
  const morceaux: string[] = [];
  const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) morceaux.push(decoderXml(m[1]));
  return morceaux.join('');
}

function indexColonne(lettres: string): number {
  let n = 0;
  for (const ch of lettres) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export async function lireXlsx(octets: Uint8Array): Promise<TableauBrut> {
  const decodeur = new TextDecoder('utf-8');
  const fichiers = await lireZip(octets);
  const texte = (nom: string) => (fichiers.has(nom) ? decodeur.decode(fichiers.get(nom)!) : '');

  // Première feuille du classeur
  let cheminFeuille = 'xl/worksheets/sheet1.xml';
  const workbook = texte('xl/workbook.xml');
  const rels = texte('xl/_rels/workbook.xml.rels');
  const premiere = /<sheet\b[^>]*\br:id="([^"]+)"/.exec(workbook);
  if (premiere) {
    const relRe = new RegExp(`<Relationship\\b[^>]*\\bId="${premiere[1]}"[^>]*>`);
    const rel = relRe.exec(rels);
    const cible = rel ? /Target="([^"]+)"/.exec(rel[0]) : null;
    if (cible) cheminFeuille = 'xl/' + cible[1].replace(/^\/?(xl\/)?/, '');
  }
  if (!fichiers.has(cheminFeuille)) {
    const alternative = [...fichiers.keys()].find((k) => k.startsWith('xl/worksheets/'));
    if (!alternative) throw new Error('Aucune feuille trouvée dans le classeur.');
    cheminFeuille = alternative;
  }

  const chaines: string[] = [];
  const sst = texte('xl/sharedStrings.xml');
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let m: RegExpExecArray | null;
  while ((m = siRe.exec(sst)) !== null) chaines.push(textesBalises(m[1]));

  const feuille = texte(cheminFeuille);
  const lignes: TableauBrut = [];
  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  while ((m = rowRe.exec(feuille)) !== null) {
    const cellules: string[] = [];
    const cRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let c: RegExpExecArray | null;
    while ((c = cRe.exec(m[1])) !== null) {
      const attrs = c[1];
      const ref = /\br="([A-Z]+)\d+"/.exec(attrs);
      const type = /\bt="([^"]+)"/.exec(attrs)?.[1];
      const corps = c[2] || '';
      let valeur = '';
      if (type === 'inlineStr') valeur = textesBalises(corps);
      else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(corps);
        const brut = v ? decoderXml(v[1]) : '';
        valeur = type === 's' ? chaines[Number(brut)] ?? '' : brut;
      }
      const col = ref ? indexColonne(ref[1]) : cellules.length;
      while (cellules.length < col) cellules.push('');
      cellules[col] = valeur.trim();
    }
    if (cellules.some((x) => x !== '')) lignes.push(cellules);
  }
  return lignes;
}

// ---------------------------------------------------------------- Analyse et vérifications
export type StatutLigne = 'nouveau' | 'complement' | 'identique' | 'erreur';

export interface LigneImport {
  numero: number; // numéro de ligne dans le fichier
  matricule: string;
  nom: string;
  prenom: string;
  sexe: 'M' | 'F' | null;
  date_naissance: string; // AAAA-MM-JJ ou ''
  lieu_naissance: string;
  statut: StatutLigne;
  erreurs: string[];
  avertissements: string[];
  eleveExistantId?: string;
  completer?: { date_naissance?: string; lieu_naissance?: string };
}

function sansAccent(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
function cle(s: string): string {
  return sansAccent(s).toLowerCase().replace(/[^a-z0-9]/g, '');
}
function comparable(s: string): string {
  return sansAccent(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

type Champ = 'matricule' | 'nom' | 'prenom' | 'nomPrenom' | 'sexe' | 'date' | 'lieu';

function champDepuisEntete(entete: string): Champ | null {
  const k = cle(entete);
  if (!k) return null;
  if (k.includes('matricule')) return 'matricule';
  if (k.includes('lieu')) return 'lieu';
  if (k.includes('naissance') || k === 'nele' || k === 'datenaiss') return 'date';
  if (k.includes('prenom')) {
    // « Nom et prénoms » (colonne unique) : il reste « nom » une fois le mot « prénom(s) » retiré
    return k.replace(/prenoms?/g, '').includes('nom') ? 'nomPrenom' : 'prenom';
  }
  if (k === 'nom' || k === 'noms' || k === 'nomdefamille' || k === 'nomeleve' || k === 'nomdelelve') return 'nom';
  if (k === 'sexe' || k === 'genre' || k === 'sx') return 'sexe';
  return null;
}

const ORDRE_PAR_DEFAUT: Champ[] = ['matricule', 'nom', 'prenom', 'sexe', 'date', 'lieu'];

export function normaliserSexe(valeur: string): 'M' | 'F' | null {
  const v = comparable(valeur);
  if (['M', 'H', 'G', 'MASCULIN', 'GARCON', 'HOMME'].includes(v)) return 'M';
  if (['F', 'FEMININ', 'FILLE', 'FEMME'].includes(v)) return 'F';
  return null;
}

function dateDepuisSerie(serie: number): string {
  const ms = Math.round((serie - 25569) * 86400000);
  const d = new Date(ms);
  return d.toISOString().slice(0, 10);
}

export function normaliserDate(valeur: string): { iso: string; avertissement?: string } {
  const v = valeur.trim();
  if (!v) return { iso: '' };
  let annee = 0;
  let mois = 0;
  let jour = 0;
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(v);
  if (m) {
    annee = Number(m[1]);
    mois = Number(m[2]);
    jour = Number(m[3]);
  } else if ((m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/.exec(v))) {
    jour = Number(m[1]);
    mois = Number(m[2]);
    annee = Number(m[3]);
  } else if (/^\d+(\.\d+)?$/.test(v) && Number(v) > 1000 && Number(v) < 80000) {
    const iso = dateDepuisSerie(Number(v));
    annee = Number(iso.slice(0, 4));
    mois = Number(iso.slice(5, 7));
    jour = Number(iso.slice(8, 10));
  } else {
    return { iso: '', avertissement: `Date de naissance illisible (« ${v} ») : laissée vide.` };
  }
  const d = new Date(Date.UTC(annee, mois - 1, jour));
  if (d.getUTCFullYear() !== annee || d.getUTCMonth() !== mois - 1 || d.getUTCDate() !== jour) {
    return { iso: '', avertissement: `Date de naissance impossible (« ${v} ») : laissée vide.` };
  }
  const iso = `${String(annee).padStart(4, '0')}-${String(mois).padStart(2, '0')}-${String(jour).padStart(2, '0')}`;
  const anneeCourante = new Date().getFullYear();
  if (annee > anneeCourante) {
    return { iso: '', avertissement: `Date de naissance dans le futur (${iso}) : laissée vide.` };
  }
  if (annee < anneeCourante - 30 || annee > anneeCourante - 5) {
    return { iso, avertissement: `Date de naissance inhabituelle pour un élève (${iso}) : à vérifier.` };
  }
  return { iso };
}

// Sépare « NOM Prénoms » : les premiers mots en majuscules forment le nom.
function separerNomPrenoms(texte: string): { nom: string; prenom: string } {
  const mots = texte.trim().split(/\s+/);
  const estMajuscule = (w: string) => w === w.toUpperCase() && w !== w.toLowerCase();
  let i = 0;
  while (i < mots.length - 1 && estMajuscule(mots[i])) i++;
  if (i === 0) i = 1;
  return { nom: mots.slice(0, i).join(' '), prenom: mots.slice(i).join(' ') };
}

export interface ContexteImport {
  classeId: string;
  elevesExistants: Eleve[]; // tous les élèves déjà enregistrés
  effectifActifClasse: number;
  capaciteMax?: number;
}

export interface ResultatAnalyse {
  lignes: LigneImport[];
  entetesDetectes: boolean;
  nouveaux: number;
  complements: number;
  identiques: number;
  erreurs: number;
}

export function analyserTableau(tableau: TableauBrut, ctx: ContexteImport): ResultatAnalyse {
  const capacite = ctx.capaciteMax ?? 100;
  let debut = 0;
  let ordre: (Champ | null)[] = [...ORDRE_PAR_DEFAUT];
  let entetesDetectes = false;

  if (tableau.length > 0) {
    const detectes = tableau[0].map(champDepuisEntete);
    if (detectes.includes('matricule') && (detectes.includes('nom') || detectes.includes('nomPrenom'))) {
      ordre = detectes;
      debut = 1;
      entetesDetectes = true;
    }
  }
  const colonne = (c: Champ) => ordre.indexOf(c);

  const existants = new Map<string, Eleve>();
  for (const e of ctx.elevesExistants) existants.set(e.matricule.trim().toUpperCase(), e);

  const vus = new Map<string, number>();
  const lignes: LigneImport[] = [];
  let places = capacite - ctx.effectifActifClasse;

  for (let i = debut; i < tableau.length; i++) {
    const cellules = tableau[i];
    const lire = (c: Champ) => {
      const idx = colonne(c);
      return idx >= 0 && idx < cellules.length ? (cellules[idx] || '').trim() : '';
    };
    const matricule = lire('matricule').replace(/[\s\u00A0]/g, '').toUpperCase();
    let nom = lire('nom');
    let prenom = lire('prenom');
    if (colonne('nomPrenom') >= 0 && !nom) {
      const sep = separerNomPrenoms(lire('nomPrenom'));
      nom = sep.nom;
      prenom = sep.prenom;
    }
    nom = nom.replace(/\s+/g, ' ').toLocaleUpperCase('fr');
    prenom = prenom.replace(/\s+/g, ' ');
    const sexe = normaliserSexe(lire('sexe'));
    const date = normaliserDate(lire('date'));
    const lieu = lire('lieu').replace(/\s+/g, ' ');

    const ligne: LigneImport = {
      numero: i + 1,
      matricule,
      nom,
      prenom,
      sexe,
      date_naissance: date.iso,
      lieu_naissance: lieu,
      statut: 'nouveau',
      erreurs: [],
      avertissements: date.avertissement ? [date.avertissement] : [],
    };

    if (!matricule) ligne.erreurs.push('Matricule manquant.');
    if (!nom) ligne.erreurs.push('Nom manquant.');
    if (!prenom) ligne.erreurs.push('Prénoms manquants.');
    if (!sexe) ligne.erreurs.push(lire('sexe') ? `Sexe non reconnu (« ${lire('sexe')} »), attendu M ou F.` : 'Sexe manquant (M ou F).');

    if (matricule) {
      const premiere = vus.get(matricule);
      if (premiere !== undefined) ligne.erreurs.push(`Matricule en double dans le fichier (déjà ligne ${premiere}).`);
      else vus.set(matricule, i + 1);
    }

    const existant = matricule ? existants.get(matricule) : undefined;
    if (ligne.erreurs.length === 0 && existant) {
      const memeNom =
        comparable(existant.nom) === comparable(nom) && comparable(existant.prenom) === comparable(prenom);
      if (!memeNom) {
        ligne.erreurs.push(`Matricule déjà attribué à un autre élève (${existant.nom} ${existant.prenom}).`);
      } else if (existant.classe_id !== ctx.classeId) {
        ligne.erreurs.push('Cet élève est déjà enregistré dans une autre classe.');
      } else {
        const completer: { date_naissance?: string; lieu_naissance?: string } = {};
        if (!existant.date_naissance && ligne.date_naissance) completer.date_naissance = ligne.date_naissance;
        if (!existant.lieu_naissance && ligne.lieu_naissance) completer.lieu_naissance = ligne.lieu_naissance;
        ligne.eleveExistantId = existant.id;
        if (Object.keys(completer).length > 0) {
          ligne.statut = 'complement';
          ligne.completer = completer;
        } else ligne.statut = 'identique';
      }
    }

    if (ligne.erreurs.length === 0 && ligne.statut === 'nouveau') {
      if (places <= 0) ligne.erreurs.push(`Effectif maximal atteint (${capacite} élèves par classe).`);
      else places -= 1;
    }
    if (ligne.erreurs.length > 0) ligne.statut = 'erreur';
    lignes.push(ligne);
  }

  const compter = (s: StatutLigne) => lignes.filter((l) => l.statut === s).length;
  return {
    lignes,
    entetesDetectes,
    nouveaux: compter('nouveau'),
    complements: compter('complement'),
    identiques: compter('identique'),
    erreurs: compter('erreur'),
  };
}
