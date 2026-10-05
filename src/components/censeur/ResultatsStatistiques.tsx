import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAnnee } from '../../context/AnneeContext';
import { storage } from '../../lib/storage';
import { calculerClassementClasse, calculerClassementAnnuelClasse } from '../../lib/appreciation';
import { Classe, Periode } from '../../types';
import { 
  BarChart3, 
  Printer, 
  Award, 
  FileSpreadsheet, 
  Filter
} from 'lucide-react';

interface LigneStatistiqueClasse {
  classe: Classe;
  inscrits: number;
  presents: number;
  abandons: number;
  moyenneGte10Count: number;
  moyenneGte10Pct: number;
  moyenneLt10Count: number;
  moyenneLt10Pct: number;
  moyenneLt65Count: number;
  moyenneLt65Pct: number;
  forteMoyenne: number | null;
  forteMoyenneEleveNom: string;
  faibleMoyenne: number | null;
  faibleMoyenneEleveNom: string;
  tauxReussite: number;
  moyenneClasse: number | null;
}

export const ResultatsStatistiques: React.FC = () => {
  const { currentUser } = useAuth();
  const { selectedAnnee } = useAnnee();
  const anneeLibelle = selectedAnnee?.libelle || storage.getParametres().annee_academique || '2026–2027';

  // Navigation entre les 3 tableaux indépendants (Exigence 11)
  const [activeTableau, setActiveTableau] = useState<'s1' | 's2' | 'annuel'>('s1');
  const [filtreNiveau, setFiltreNiveau] = useState<string>('TOUS');

  // Données dynamiques de base (Exigence 12 : réévaluation dynamique depuis le storage)
  const classes = useMemo(() => storage.getClasses(), [activeTableau, filtreNiveau, selectedAnnee?.libelle]);
  const periodes = useMemo(() => storage.getPeriodesByAnnee(anneeLibelle), [anneeLibelle]);
  const matieres = useMemo(() => storage.getMatieres(), []);
  const allNotes = useMemo(() => storage.getNotes(), []);
  const allAffectations = useMemo(() => storage.getAffectations(anneeLibelle), [anneeLibelle]);

  // Détection des périodes S1 et S2
  const periodeS1: Periode | undefined = useMemo(() => {
    return periodes.find((p) => p.numero === 1 || p.nom.toLowerCase().includes('1') || p.nom.toLowerCase().includes('premier')) || periodes[0];
  }, [periodes]);

  const periodeS2: Periode | undefined = useMemo(() => {
    return periodes.find((p) => p.numero === 2 || p.nom.toLowerCase().includes('2') || p.nom.toLowerCase().includes('deux')) || periodes[1] || periodes[0];
  }, [periodes]);

  // Classes filtrées
  const filteredClasses = useMemo(() => {
    if (filtreNiveau === 'TOUS') return classes;
    return classes.filter((c) => c.niveau === filtreNiveau);
  }, [classes, filtreNiveau]);

  // Fonction de calcul statistique pour un semestre donné
  const computeSemestreStats = (targetPeriode: Periode | undefined): {
    lignes: LigneStatistiqueClasse[];
    totaux: {
      inscrits: number;
      presents: number;
      abandons: number;
      moyenneGte10Count: number;
      moyenneGte10Pct: number;
      moyenneLt10Count: number;
      moyenneLt10Pct: number;
      moyenneLt65Count: number;
      moyenneLt65Pct: number;
      forteMoyenneGlobale: number | null;
      forteMoyenneGlobaleEleve: string;
      forteMoyenneGlobaleClasse: string;
      faibleMoyenneGlobale: number | null;
      faibleMoyenneGlobaleEleve: string;
      faibleMoyenneGlobaleClasse: string;
      tauxReussiteGlobal: number;
      moyenneGeneraleCollege: number | null;
    };
  } => {
    if (!targetPeriode) {
      return {
        lignes: [],
        totaux: {
          inscrits: 0, presents: 0, abandons: 0,
          moyenneGte10Count: 0, moyenneGte10Pct: 0,
          moyenneLt10Count: 0, moyenneLt10Pct: 0,
          moyenneLt65Count: 0, moyenneLt65Pct: 0,
          forteMoyenneGlobale: null, forteMoyenneGlobaleEleve: '', forteMoyenneGlobaleClasse: '',
          faibleMoyenneGlobale: null, faibleMoyenneGlobaleEleve: '', faibleMoyenneGlobaleClasse: '',
          tauxReussiteGlobal: 0, moyenneGeneraleCollege: null
        }
      };
    }

    const lignes: LigneStatistiqueClasse[] = [];
    let totInscrits = 0;
    let totPresents = 0;
    let totAbandons = 0;
    let totGte10 = 0;
    let totLt10 = 0;
    let totLt65 = 0;
    let sumMoyennesPresents = 0;
    let countMoyennesPresents = 0;

    let bestMoy: number | null = null;
    let bestEleve = '';
    let bestClasse = '';

    let worstMoy: number | null = null;
    let worstEleve = '';
    let worstClasse = '';

    filteredClasses.forEach((cls) => {
      const elevesClasse = storage.getElevesByClasse(cls.id, anneeLibelle);
      const inscrits = elevesClasse.length;
      totInscrits += inscrits;

      const { classement } = calculerClassementClasse(
        cls,
        elevesClasse,
        targetPeriode,
        matieres,
        allNotes,
        allAffectations
      );

      // Présents = élèves ayant une moyenne calculée (ayant composé)
      const presentsList = classement.filter((c) => c.moyenne_generale !== null);
      const presents = presentsList.length;
      // Abandons = élèves déclarés abandonnés ou n'ayant composé à aucune épreuve
      const abandonsList = elevesClasse.filter((e) => storage.isEleveAbandon(e.id, anneeLibelle) || !presentsList.some((p) => p.eleve_id === e.id));
      const abandons = abandonsList.length;

      totPresents += presents;
      totAbandons += abandons;

      const gte10 = presentsList.filter((c) => (c.moyenne_generale || 0) >= 10);
      const lt10 = presentsList.filter((c) => (c.moyenne_generale || 0) < 10);
      const lt65 = presentsList.filter((c) => (c.moyenne_generale || 0) < 6.5);

      totGte10 += gte10.length;
      totLt10 += lt10.length;
      totLt65 += lt65.length;

      // Pourcentages arrondis au dixième
      const gte10Pct = presents > 0 ? Math.round((gte10.length / presents) * 1000) / 10 : 0;
      const lt10Pct = presents > 0 ? Math.round((lt10.length / presents) * 1000) / 10 : 0;
      const lt65Pct = presents > 0 ? Math.round((lt65.length / presents) * 1000) / 10 : 0;
      const tauxReussite = gte10Pct;

      // Meilleur élève de la classe
      const forteMoy = presentsList[0]?.moyenne_generale ?? null;
      const forteEleveNom = presentsList[0] ? `${presentsList[0].nom} ${presentsList[0].prenom}` : '—';

      // Plus faible moyenne
      const faibleMoy = presentsList[presentsList.length - 1]?.moyenne_generale ?? null;
      const faibleEleveNom = presentsList[presentsList.length - 1] ? `${presentsList[presentsList.length - 1].nom} ${presentsList[presentsList.length - 1].prenom}` : '—';

      // Moyenne de la classe
      let moyClasse: number | null = null;
      if (presents > 0) {
        const sum = presentsList.reduce((acc, curr) => acc + (curr.moyenne_generale || 0), 0);
        moyClasse = Math.round((sum / presents) * 100) / 100;
        sumMoyennesPresents += sum;
        countMoyennesPresents += presents;
      }

      // Record global
      if (forteMoy !== null) {
        if (bestMoy === null || forteMoy > bestMoy) {
          bestMoy = forteMoy;
          bestEleve = forteEleveNom;
          bestClasse = cls.nom;
        }
      }
      if (faibleMoy !== null) {
        if (worstMoy === null || faibleMoy < worstMoy) {
          worstMoy = faibleMoy;
          worstEleve = faibleEleveNom;
          worstClasse = cls.nom;
        }
      }

      lignes.push({
        classe: cls,
        inscrits,
        presents,
        abandons,
        moyenneGte10Count: gte10.length,
        moyenneGte10Pct: gte10Pct,
        moyenneLt10Count: lt10.length,
        moyenneLt10Pct: lt10Pct,
        moyenneLt65Count: lt65.length,
        moyenneLt65Pct: lt65Pct,
        forteMoyenne: forteMoy,
        forteMoyenneEleveNom: forteEleveNom,
        faibleMoyenne: faibleMoy,
        faibleMoyenneEleveNom: faibleEleveNom,
        tauxReussite,
        moyenneClasse: moyClasse
      });
    });

    const totGte10Pct = totPresents > 0 ? Math.round((totGte10 / totPresents) * 1000) / 10 : 0;
    const totLt10Pct = totPresents > 0 ? Math.round((totLt10 / totPresents) * 1000) / 10 : 0;
    const totLt65Pct = totPresents > 0 ? Math.round((totLt65 / totPresents) * 1000) / 10 : 0;
    const moyCollege = countMoyennesPresents > 0 ? Math.round((sumMoyennesPresents / countMoyennesPresents) * 100) / 100 : null;

    return {
      lignes,
      totaux: {
        inscrits: totInscrits,
        presents: totPresents,
        abandons: totAbandons,
        moyenneGte10Count: totGte10,
        moyenneGte10Pct: totGte10Pct,
        moyenneLt10Count: totLt10,
        moyenneLt10Pct: totLt10Pct,
        moyenneLt65Count: totLt65,
        moyenneLt65Pct: totLt65Pct,
        forteMoyenneGlobale: bestMoy,
        forteMoyenneGlobaleEleve: bestEleve,
        forteMoyenneGlobaleClasse: bestClasse,
        faibleMoyenneGlobale: worstMoy,
        faibleMoyenneGlobaleEleve: worstEleve,
        faibleMoyenneGlobaleClasse: worstClasse,
        tauxReussiteGlobal: totGte10Pct,
        moyenneGeneraleCollege: moyCollege
      }
    };
  };

  // Fonction de calcul statistique pour le bilan ANNUEL
  const computeAnnuelStats = (): {
    lignes: LigneStatistiqueClasse[];
    totaux: {
      inscrits: number;
      presents: number;
      abandons: number;
      moyenneGte10Count: number;
      moyenneGte10Pct: number;
      moyenneLt10Count: number;
      moyenneLt10Pct: number;
      moyenneLt65Count: number;
      moyenneLt65Pct: number;
      forteMoyenneGlobale: number | null;
      forteMoyenneGlobaleEleve: string;
      forteMoyenneGlobaleClasse: string;
      faibleMoyenneGlobale: number | null;
      faibleMoyenneGlobaleEleve: string;
      faibleMoyenneGlobaleClasse: string;
      tauxReussiteGlobal: number;
      moyenneGeneraleCollege: number | null;
    };
  } => {
    if (!periodeS1 || !periodeS2) {
      return {
        lignes: [],
        totaux: {
          inscrits: 0, presents: 0, abandons: 0,
          moyenneGte10Count: 0, moyenneGte10Pct: 0,
          moyenneLt10Count: 0, moyenneLt10Pct: 0,
          moyenneLt65Count: 0, moyenneLt65Pct: 0,
          forteMoyenneGlobale: null, forteMoyenneGlobaleEleve: '', forteMoyenneGlobaleClasse: '',
          faibleMoyenneGlobale: null, faibleMoyenneGlobaleEleve: '', faibleMoyenneGlobaleClasse: '',
          tauxReussiteGlobal: 0, moyenneGeneraleCollege: null
        }
      };
    }

    const lignes: LigneStatistiqueClasse[] = [];
    let totInscrits = 0;
    let totPresents = 0;
    let totAbandons = 0;
    let totGte10 = 0;
    let totLt10 = 0;
    let totLt65 = 0;
    let sumMoyennesPresents = 0;
    let countMoyennesPresents = 0;

    let bestMoy: number | null = null;
    let bestEleve = '';
    let bestClasse = '';

    let worstMoy: number | null = null;
    let worstEleve = '';
    let worstClasse = '';

    filteredClasses.forEach((cls) => {
      const elevesClasse = storage.getElevesByClasse(cls.id, anneeLibelle);
      const inscrits = elevesClasse.length;
      totInscrits += inscrits;

      const { classement } = calculerClassementAnnuelClasse(
        cls,
        elevesClasse,
        periodeS1,
        periodeS2,
        matieres,
        allNotes,
        anneeLibelle,
        allAffectations
      );

      const presentsList = classement.filter((c) => c.moyenne_annuelle !== null);
      const presents = presentsList.length;
      const abandonsList = elevesClasse.filter((e) => storage.isEleveAbandon(e.id, anneeLibelle) || !presentsList.some((p) => p.eleve_id === e.id));
      const abandons = abandonsList.length;

      totPresents += presents;
      totAbandons += abandons;

      const gte10 = presentsList.filter((c) => (c.moyenne_annuelle || 0) >= 10);
      const lt10 = presentsList.filter((c) => (c.moyenne_annuelle || 0) < 10);
      const lt65 = presentsList.filter((c) => (c.moyenne_annuelle || 0) < 6.5);

      totGte10 += gte10.length;
      totLt10 += lt10.length;
      totLt65 += lt65.length;

      const gte10Pct = presents > 0 ? Math.round((gte10.length / presents) * 1000) / 10 : 0;
      const lt10Pct = presents > 0 ? Math.round((lt10.length / presents) * 1000) / 10 : 0;
      const lt65Pct = presents > 0 ? Math.round((lt65.length / presents) * 1000) / 10 : 0;
      const tauxReussite = gte10Pct;

      const forteMoy = presentsList[0]?.moyenne_annuelle ?? null;
      const forteEleveNom = presentsList[0] ? `${presentsList[0].nom} ${presentsList[0].prenom}` : '—';

      const faibleMoy = presentsList[presentsList.length - 1]?.moyenne_annuelle ?? null;
      const faibleEleveNom = presentsList[presentsList.length - 1] ? `${presentsList[presentsList.length - 1].nom} ${presentsList[presentsList.length - 1].prenom}` : '—';

      let moyClasse: number | null = null;
      if (presents > 0) {
        const sum = presentsList.reduce((acc, curr) => acc + (curr.moyenne_annuelle || 0), 0);
        moyClasse = Math.round((sum / presents) * 100) / 100;
        sumMoyennesPresents += sum;
        countMoyennesPresents += presents;
      }

      if (forteMoy !== null) {
        if (bestMoy === null || forteMoy > bestMoy) {
          bestMoy = forteMoy;
          bestEleve = forteEleveNom;
          bestClasse = cls.nom;
        }
      }
      if (faibleMoy !== null) {
        if (worstMoy === null || faibleMoy < worstMoy) {
          worstMoy = faibleMoy;
          worstEleve = faibleEleveNom;
          worstClasse = cls.nom;
        }
      }

      lignes.push({
        classe: cls,
        inscrits,
        presents,
        abandons,
        moyenneGte10Count: gte10.length,
        moyenneGte10Pct: gte10Pct,
        moyenneLt10Count: lt10.length,
        moyenneLt10Pct: lt10Pct,
        moyenneLt65Count: lt65.length,
        moyenneLt65Pct: lt65Pct,
        forteMoyenne: forteMoy,
        forteMoyenneEleveNom: forteEleveNom,
        faibleMoyenne: faibleMoy,
        faibleMoyenneEleveNom: faibleEleveNom,
        tauxReussite,
        moyenneClasse: moyClasse
      });
    });

    const totGte10Pct = totPresents > 0 ? Math.round((totGte10 / totPresents) * 1000) / 10 : 0;
    const totLt10Pct = totPresents > 0 ? Math.round((totLt10 / totPresents) * 1000) / 10 : 0;
    const totLt65Pct = totPresents > 0 ? Math.round((totLt65 / totPresents) * 1000) / 10 : 0;
    const moyCollege = countMoyennesPresents > 0 ? Math.round((sumMoyennesPresents / countMoyennesPresents) * 100) / 100 : null;

    return {
      lignes,
      totaux: {
        inscrits: totInscrits,
        presents: totPresents,
        abandons: totAbandons,
        moyenneGte10Count: totGte10,
        moyenneGte10Pct: totGte10Pct,
        moyenneLt10Count: totLt10,
        moyenneLt10Pct: totLt10Pct,
        moyenneLt65Count: totLt65,
        moyenneLt65Pct: totLt65Pct,
        forteMoyenneGlobale: bestMoy,
        forteMoyenneGlobaleEleve: bestEleve,
        forteMoyenneGlobaleClasse: bestClasse,
        faibleMoyenneGlobale: worstMoy,
        faibleMoyenneGlobaleEleve: worstEleve,
        faibleMoyenneGlobaleClasse: worstClasse,
        tauxReussiteGlobal: totGte10Pct,
        moyenneGeneraleCollege: moyCollege
      }
    };
  };

  // Données des 3 tableaux indépendants
  const dataS1 = useMemo(() => computeSemestreStats(periodeS1), [periodeS1, filteredClasses, matieres, allNotes, allAffectations, anneeLibelle]);
  const dataS2 = useMemo(() => computeSemestreStats(periodeS2), [periodeS2, filteredClasses, matieres, allNotes, allAffectations, anneeLibelle]);
  const dataAnnuel = useMemo(() => computeAnnuelStats(), [periodeS1, periodeS2, filteredClasses, matieres, allNotes, allAffectations, anneeLibelle]);

  const currentData = activeTableau === 's1' ? dataS1 : activeTableau === 's2' ? dataS2 : dataAnnuel;

  // Titres exacts selon l'Exigence 11 (strictement séparés)
  const currentTitle = activeTableau === 's1' 
    ? 'TABLEAU ANALYTIQUE DU PREMIER SEMESTRE' 
    : activeTableau === 's2' 
    ? 'TABLEAU ANALYTIQUE DU SECOND SEMESTRE' 
    : 'TABLEAU ANALYTIQUE ANNUEL';

  // ====================================================================
  // GROUPEMENT DYNAMIQUE PAR PROMOTION AVEC TOTAL PROMOTION (Exigence 4)
  // ET TOTAL DU PREMIER CYCLE RECALCULÉ PAR EFFECTIFS CUMULÉS (Exigence 5)
  // ====================================================================
  const promotionGroups = useMemo(() => {
    const list = currentData.lignes;
    if (list.length === 0) return [];

    const canonicalOrder = ['6ème', '5ème', '4ème', '3ème', 'Seconde', 'Première', 'Terminale'];

    const map = new Map<string, LigneStatistiqueClasse[]>();
    list.forEach((row) => {
      const niv = row.classe.niveau;
      if (!map.has(niv)) {
        map.set(niv, []);
      }
      map.get(niv)!.push(row);
    });

    const sortedNiveaux = Array.from(map.keys()).sort((a, b) => {
      const idxA = canonicalOrder.findIndex((k) => k.toLowerCase() === a.toLowerCase() || a.toLowerCase().startsWith(k.toLowerCase().slice(0, 3)));
      const idxB = canonicalOrder.findIndex((k) => k.toLowerCase() === b.toLowerCase() || b.toLowerCase().startsWith(k.toLowerCase().slice(0, 3)));
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    return sortedNiveaux.map((niv) => {
      const rows = map.get(niv) || [];
      rows.sort((a, b) => a.classe.nom.localeCompare(b.classe.nom));

      const isPremier = ['6ème', '5ème', '4ème', '3ème', '6e', '5e', '4e', '3e'].some(
        (p) => niv.toLowerCase().includes(p.toLowerCase())
      );

      let label = niv;
      if (niv.includes('6')) label = '6e';
      else if (niv.includes('5')) label = '5e';
      else if (niv.includes('4')) label = '4e';
      else if (niv.includes('3')) label = '3e';

      let inscrits = 0;
      let presents = 0;
      let abandons = 0;
      let gte10 = 0;
      let lt10 = 0;
      let lt65 = 0;
      let sumMoy = 0;
      let countMoy = 0;
      let bestMoy: number | null = null;
      let bestEleve = '—';
      let worstMoy: number | null = null;
      let worstEleve = '—';

      rows.forEach((r) => {
        inscrits += r.inscrits;
        presents += r.presents;
        abandons += r.abandons;
        gte10 += r.moyenneGte10Count;
        lt10 += r.moyenneLt10Count;
        lt65 += r.moyenneLt65Count;
        if (r.moyenneClasse !== null && r.presents > 0) {
          sumMoy += r.moyenneClasse * r.presents;
          countMoy += r.presents;
        }
        if (r.forteMoyenne !== null) {
          if (bestMoy === null || r.forteMoyenne > bestMoy) {
            bestMoy = r.forteMoyenne;
            bestEleve = `${r.forteMoyenneEleveNom} (${r.classe.nom})`;
          }
        }
        if (r.faibleMoyenne !== null) {
          if (worstMoy === null || r.faibleMoyenne < worstMoy) {
            worstMoy = r.faibleMoyenne;
            worstEleve = `${r.faibleMoyenneEleveNom} (${r.classe.nom})`;
          }
        }
      });

      // Recalcul strict à partir des effectifs cumulés
      const gte10Pct = presents > 0 ? Math.round((gte10 / presents) * 1000) / 10 : 0;
      const lt10Pct = presents > 0 ? Math.round((lt10 / presents) * 1000) / 10 : 0;
      const lt65Pct = presents > 0 ? Math.round((lt65 / presents) * 1000) / 10 : 0;
      const moyClasse = countMoy > 0 ? Math.round((sumMoy / countMoy) * 100) / 100 : null;

      return {
        niveau: niv,
        label,
        isPremierCycle: isPremier,
        rows,
        totals: {
          inscrits,
          presents,
          abandons,
          moyenneGte10Count: gte10,
          moyenneGte10Pct: gte10Pct,
          moyenneLt10Count: lt10,
          moyenneLt10Pct: lt10Pct,
          moyenneLt65Count: lt65,
          moyenneLt65Pct: lt65Pct,
          forteMoyenne: bestMoy,
          forteMoyenneEleveNom: bestEleve,
          faibleMoyenne: worstMoy,
          faibleMoyenneEleveNom: worstEleve,
          tauxReussite: gte10Pct,
          moyenneClasse: moyClasse,
        },
      };
    });
  }, [currentData.lignes]);

  // TOTAL DU PREMIER CYCLE (Exigence 5)
  const totalPremierCycle = useMemo(() => {
    const premierPromos = promotionGroups.filter((g) => g.isPremierCycle);
    if (premierPromos.length === 0) return null;

    let inscrits = 0;
    let presents = 0;
    let abandons = 0;
    let gte10 = 0;
    let lt10 = 0;
    let lt65 = 0;
    let sumMoy = 0;
    let countMoy = 0;
    let bestMoy: number | null = null;
    let bestEleve = '—';
    let worstMoy: number | null = null;
    let worstEleve = '—';

    premierPromos.forEach((g) => {
      inscrits += g.totals.inscrits;
      presents += g.totals.presents;
      abandons += g.totals.abandons;
      gte10 += g.totals.moyenneGte10Count;
      lt10 += g.totals.moyenneLt10Count;
      lt65 += g.totals.moyenneLt65Count;
      if (g.totals.moyenneClasse !== null && g.totals.presents > 0) {
        sumMoy += g.totals.moyenneClasse * g.totals.presents;
        countMoy += g.totals.presents;
      }
      if (g.totals.forteMoyenne !== null) {
        if (bestMoy === null || g.totals.forteMoyenne > bestMoy) {
          bestMoy = g.totals.forteMoyenne;
          bestEleve = g.totals.forteMoyenneEleveNom;
        }
      }
      if (g.totals.faibleMoyenne !== null) {
        if (worstMoy === null || g.totals.faibleMoyenne < worstMoy) {
          worstMoy = g.totals.faibleMoyenne;
          worstEleve = g.totals.faibleMoyenneEleveNom;
        }
      }
    });

    // RÈGLE ABSOLUE (Exigence 5) : Recalculer chaque pourcentage à partir des effectifs cumulés, jamais de somme de % !
    const gte10Pct = presents > 0 ? Math.round((gte10 / presents) * 1000) / 10 : 0;
    const lt10Pct = presents > 0 ? Math.round((lt10 / presents) * 1000) / 10 : 0;
    const lt65Pct = presents > 0 ? Math.round((lt65 / presents) * 1000) / 10 : 0;
    const moyClasse = countMoy > 0 ? Math.round((sumMoy / countMoy) * 100) / 100 : null;

    return {
      inscrits,
      presents,
      abandons,
      moyenneGte10Count: gte10,
      moyenneGte10Pct: gte10Pct,
      moyenneLt10Count: lt10,
      moyenneLt10Pct: lt10Pct,
      moyenneLt65Count: lt65,
      moyenneLt65Pct: lt65Pct,
      forteMoyenne: bestMoy,
      forteMoyenneEleveNom: bestEleve,
      faibleMoyenne: worstMoy,
      faibleMoyenneEleveNom: worstEleve,
      tauxReussite: gte10Pct,
      moyenneClasse: moyClasse,
    };
  }, [promotionGroups]);

  // TOTAL DU SECOND CYCLE (si des classes du second cycle sont présentes)
  const totalSecondCycle = useMemo(() => {
    const secondPromos = promotionGroups.filter((g) => !g.isPremierCycle);
    if (secondPromos.length === 0) return null;

    let inscrits = 0;
    let presents = 0;
    let abandons = 0;
    let gte10 = 0;
    let lt10 = 0;
    let lt65 = 0;
    let sumMoy = 0;
    let countMoy = 0;
    let bestMoy: number | null = null;
    let bestEleve = '—';
    let worstMoy: number | null = null;
    let worstEleve = '—';

    secondPromos.forEach((g) => {
      inscrits += g.totals.inscrits;
      presents += g.totals.presents;
      abandons += g.totals.abandons;
      gte10 += g.totals.moyenneGte10Count;
      lt10 += g.totals.moyenneLt10Count;
      lt65 += g.totals.moyenneLt65Count;
      if (g.totals.moyenneClasse !== null && g.totals.presents > 0) {
        sumMoy += g.totals.moyenneClasse * g.totals.presents;
        countMoy += g.totals.presents;
      }
      if (g.totals.forteMoyenne !== null) {
        if (bestMoy === null || g.totals.forteMoyenne > bestMoy) {
          bestMoy = g.totals.forteMoyenne;
          bestEleve = g.totals.forteMoyenneEleveNom;
        }
      }
      if (g.totals.faibleMoyenne !== null) {
        if (worstMoy === null || g.totals.faibleMoyenne < worstMoy) {
          worstMoy = g.totals.faibleMoyenne;
          worstEleve = g.totals.faibleMoyenneEleveNom;
        }
      }
    });

    const gte10Pct = presents > 0 ? Math.round((gte10 / presents) * 1000) / 10 : 0;
    const lt10Pct = presents > 0 ? Math.round((lt10 / presents) * 1000) / 10 : 0;
    const lt65Pct = presents > 0 ? Math.round((lt65 / presents) * 1000) / 10 : 0;
    const moyClasse = countMoy > 0 ? Math.round((sumMoy / countMoy) * 100) / 100 : null;

    return {
      inscrits,
      presents,
      abandons,
      moyenneGte10Count: gte10,
      moyenneGte10Pct: gte10Pct,
      moyenneLt10Count: lt10,
      moyenneLt10Pct: lt10Pct,
      moyenneLt65Count: lt65,
      moyenneLt65Pct: lt65Pct,
      forteMoyenne: bestMoy,
      forteMoyenneEleveNom: bestEleve,
      faibleMoyenne: worstMoy,
      faibleMoyenneEleveNom: worstEleve,
      tauxReussite: gte10Pct,
      moyenneClasse: moyClasse,
    };
  }, [promotionGroups]);

  // Index de la dernière promotion du premier cycle affichée
  const lastPremierCyclePromoIndex = useMemo(() => {
    let lastIdx = -1;
    promotionGroups.forEach((g, idx) => {
      if (g.isPremierCycle) lastIdx = idx;
    });
    return lastIdx;
  }, [promotionGroups]);

  const lastSecondCyclePromoIndex = useMemo(() => {
    let lastIdx = -1;
    promotionGroups.forEach((g, idx) => {
      if (!g.isPremierCycle) lastIdx = idx;
    });
    return lastIdx;
  }, [promotionGroups]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* En-tête officiel et sélecteur de tableaux (Masqué à l'impression) */}
      <div className="print:hidden space-y-4">
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-emerald-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="bg-amber-400 text-slate-950 text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Tableaux Statistiques & Analytiques
              </span>
              <span className="text-emerald-300 text-xs font-mono">• Année {anneeLibelle}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-1 text-white flex items-center space-x-2">
              <BarChart3 className="w-6 h-6 text-emerald-400" />
              <span>{currentTitle}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
              Consultation des indicateurs scolaires : totaux par promotion, total du premier cycle, taux de réussite et moyennes par classe. Accessible à l’Administration et au Corps Enseignant.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-white text-slate-900 hover:bg-slate-100 font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors flex items-center space-x-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-600" />
              <span>Imprimer ce Tableau</span>
            </button>
          </div>
        </div>

        {/* 3 ONGLETS INDÉPENDANTS OBLIGATOIRES (Exigence 11 : strictement séparés) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <button
              id="tab-analytique-s1"
              onClick={() => setActiveTableau('s1')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTableau === 's1'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>PREMIER SEMESTRE</span>
            </button>

            <button
              id="tab-analytique-s2"
              onClick={() => setActiveTableau('s2')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTableau === 's2'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>SECOND SEMESTRE</span>
            </button>

            <button
              id="tab-analytique-annuel"
              onClick={() => setActiveTableau('annuel')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTableau === 'annuel'
                  ? 'bg-indigo-900 text-white shadow-sm ring-2 ring-indigo-400'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Award className="w-4 h-4 text-amber-300" />
              <span>BILAN ANNUEL</span>
            </button>
          </div>

          {/* Filtre de niveau de classe */}
          <div className="flex items-center space-x-2 text-xs w-full sm:w-auto justify-end">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-bold text-slate-600">Promotion / Niveau :</span>
            <select
              value={filtreNiveau}
              onChange={(e) => setFiltreNiveau(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 cursor-pointer focus:ring-1 focus:ring-emerald-500"
            >
              <option value="TOUS">Toutes les classes ({classes.length})</option>
              <option value="6ème">6ème</option>
              <option value="5ème">5ème</option>
              <option value="4ème">4ème</option>
              <option value="3ème">3ème</option>
              <option value="Seconde">Seconde</option>
              <option value="Première">Première</option>
              <option value="Terminale">Terminale</option>
            </select>
          </div>
        </div>

        {/* Cartes Synthèse Rapide */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Effectif Évalué</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {currentData.totaux.presents} <span className="text-xs text-slate-500 font-normal">/ {currentData.totaux.inscrits} inscrits</span>
            </div>
            <div className="text-[11px] text-amber-700 mt-0.5">
              {currentData.totaux.abandons} non classé(s) / abandon(s)
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Taux de Réussite Global (M ≥ 10)</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              {currentData.totaux.tauxReussiteGlobal} %
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {currentData.totaux.moyenneGte10Count} apprenant(s) admis
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Moyenne Générale Collège</span>
            <div className="text-2xl font-black text-indigo-900 mt-1 font-mono">
              {currentData.totaux.moyenneGeneraleCollege !== null ? `${currentData.totaux.moyenneGeneraleCollege} / 20` : '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Sur l'ensemble des classes
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Major de l'Établissement</span>
            <div className="text-lg font-black text-amber-600 mt-1 truncate">
              {currentData.totaux.forteMoyenneGlobale !== null ? `${currentData.totaux.forteMoyenneGlobale} / 20` : '—'}
            </div>
            <div className="text-[11px] text-slate-600 font-semibold truncate mt-0.5">
              {currentData.totaux.forteMoyenneGlobaleEleve || '—'} {currentData.totaux.forteMoyenneGlobaleClasse ? `(${currentData.totaux.forteMoyenneGlobaleClasse})` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* FEUILLE OFFICIELLE DU TABLEAU STATISTIQUE (IMPRIMABLE) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-4 sm:p-8 print:p-0 print:border-none print:shadow-none space-y-4">
        
        {/* EXIGENCE 10 & 11 : SUPPRESSION COMPLÈTE DE L'EN-TÊTE RÉPUBLIQUE DU BÉNIN... CEG GOGBO.
            CONSERVATION UNIQUE DU TITRE DU TABLEAU */}
        <div className="pb-3 text-center border-b border-slate-200">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-wider">
            {currentTitle}
          </h2>
          <div className="text-xs font-bold text-slate-600 mt-1">
            ANNÉE SCOLAIRE : <span className="font-mono text-emerald-800 font-black">{anneeLibelle}</span>
          </div>
        </div>

        {/* Le Tableau Analytique avec colonnes séparées (Exigence 6), Totaux par Promotion (Exigence 4) et Total 1er Cycle (Exigence 5) */}
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-800 text-white font-black text-center text-[10px] uppercase tracking-wider">
                <th className="border border-slate-300 px-2 py-2.5 text-left w-20">Classe</th>
                <th className="border border-slate-300 px-2 py-2.5 w-14">Inscrits</th>
                <th className="border border-slate-300 px-2 py-2.5 w-14">Présents</th>
                <th className="border border-slate-300 px-2 py-2.5 w-14">Abandons</th>
                <th className="border border-slate-300 px-2 py-2.5 w-14 bg-emerald-900 text-white">M ≥ 10</th>
                <th className="border border-slate-300 px-2 py-2.5 w-14 bg-emerald-800 text-white">%</th>
                <th className="border border-slate-300 px-2 py-2.5 w-14 bg-amber-950 text-white">M &lt; 10</th>
                <th className="border border-slate-300 px-2 py-2.5 w-14 bg-amber-900 text-white">%</th>
                <th className="border border-slate-300 px-2 py-2.5 w-14 bg-rose-950 text-white">M &lt; 6,5</th>
                <th className="border border-slate-300 px-2 py-2.5 w-14 bg-rose-900 text-white">%</th>
                <th className="border border-slate-300 px-2 py-2.5 w-14">Forte Moy.</th>
                <th className="border border-slate-300 px-2 py-2.5 text-left min-w-[120px]">Major (Nom & Prénoms)</th>
                <th className="border border-slate-300 px-2 py-2.5 w-14">Faible Moy.</th>
                <th className="border border-slate-300 px-2 py-2.5 text-left min-w-[120px]">Dernier (Nom & Prénoms)</th>
                <th className="border border-slate-300 px-2 py-2.5 w-16 bg-emerald-950 text-white">Taux Réussite</th>
                <th className="border border-slate-300 px-2 py-2.5 w-14">Moy. Classe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {promotionGroups.length === 0 ? (
                <tr>
                  <td colSpan={16} className="text-center py-8 text-slate-500">
                    Aucune classe ou donnée scolaire disponible pour cette sélection.
                  </td>
                </tr>
              ) : (
                promotionGroups.map((group, groupIdx) => (
                  <React.Fragment key={group.niveau}>
                    {/* 1. Classes individuelles de la promotion (6eA, 6eB, 6eC, 6eD, 6eE, 6eF...) */}
                    {group.rows.map((row, idx) => (
                      <tr 
                        key={row.classe.id} 
                        className={`hover:bg-emerald-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}
                      >
                        {/* 1. Classe */}
                        <td className="border border-slate-300 px-2 py-2 font-black text-slate-900 whitespace-nowrap">
                          {row.classe.nom}
                        </td>

                        {/* 2. Inscrits */}
                        <td className="border border-slate-300 px-2 py-2 text-center font-mono font-bold text-slate-800">
                          {row.inscrits}
                        </td>

                        {/* 3. Présents */}
                        <td className="border border-slate-300 px-2 py-2 text-center font-mono font-bold text-emerald-800">
                          {row.presents}
                        </td>

                        {/* 4. Abandons */}
                        <td className="border border-slate-300 px-2 py-2 text-center font-mono text-slate-500">
                          {row.abandons}
                        </td>

                        {/* 5. M >= 10 (Effectif) */}
                        <td className="border border-slate-300 px-2 py-2 text-center font-mono font-bold text-emerald-900 bg-emerald-50/50">
                          {row.moyenneGte10Count}
                        </td>

                        {/* 6. % M >= 10 */}
                        <td className="border border-slate-300 px-2 py-2 text-center font-mono font-semibold text-emerald-700 bg-emerald-50/30">
                          {row.moyenneGte10Pct} %
                        </td>

                        {/* 7. M < 10 (Effectif) */}
                        <td className="border border-slate-300 px-2 py-2 text-center font-mono font-bold text-amber-900 bg-amber-50/50">
                          {row.moyenneLt10Count}
                        </td>

                        {/* 8. % M < 10 */}
                        <td className="border border-slate-300 px-2 py-2 text-center font-mono font-semibold text-amber-700 bg-amber-50/30">
                          {row.moyenneLt10Pct} %
                        </td>

                        {/* 9. M < 6.5 (Effectif) */}
                        <td className="border border-slate-300 px-2 py-2 text-center font-mono font-bold text-rose-900 bg-rose-50/50">
                          {row.moyenneLt65Count}
                        </td>

                        {/* 10. % M < 6.5 */}
                        <td className="border border-slate-300 px-2 py-2 text-center font-mono font-semibold text-rose-700 bg-rose-50/30">
                          {row.moyenneLt65Pct} %
                        </td>

                        {/* 11. Forte moyenne */}
                        <td className="border border-slate-300 px-2 py-2 text-center font-mono font-bold text-emerald-700">
                          {row.forteMoyenne !== null ? row.forteMoyenne.toFixed(2) : '—'}
                        </td>

                        {/* 12. Major (Nom & Prénoms) */}
                        <td className="border border-slate-300 px-2 py-2 text-left font-semibold text-slate-800 truncate max-w-[140px]">
                          {row.forteMoyenneEleveNom}
                        </td>

                        {/* 13. Faible moyenne */}
                        <td className="border border-slate-300 px-2 py-2 text-center font-mono font-bold text-rose-700">
                          {row.faibleMoyenne !== null ? row.faibleMoyenne.toFixed(2) : '—'}
                        </td>

                        {/* 14. Dernier (Nom & Prénoms) */}
                        <td className="border border-slate-300 px-2 py-2 text-left text-slate-600 truncate max-w-[140px]">
                          {row.faibleMoyenneEleveNom}
                        </td>

                        {/* 15. Taux de réussite */}
                        <td className="border border-slate-300 px-2 py-2 text-center font-mono font-black text-emerald-950 bg-emerald-100/60">
                          {row.tauxReussite} %
                        </td>

                        {/* 16. Moyenne de classe */}
                        <td className="border border-slate-300 px-2 py-2 text-center font-mono font-bold text-slate-900">
                          {row.moyenneClasse !== null ? row.moyenneClasse.toFixed(2) : '—'}
                        </td>
                      </tr>
                    ))}

                    {/* 2. LIGNE TOTAL APRÈS CHAQUE PROMOTION (Exigence 4 : Total 6e, Total 5e, Total 4e, Total 3e...) */}
                    <tr className="bg-emerald-100/90 text-slate-900 font-bold text-xs border-y-2 border-emerald-300">
                      <td className="border border-slate-300 px-2.5 py-2 text-left font-black text-emerald-950">
                        Total {group.label}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-center font-mono font-bold">
                        {group.totals.inscrits}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-center font-mono font-bold text-emerald-900">
                        {group.totals.presents}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-center font-mono text-slate-600">
                        {group.totals.abandons}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-center font-mono font-bold text-emerald-950 bg-emerald-200/60">
                        {group.totals.moyenneGte10Count}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-center font-mono font-bold text-emerald-900 bg-emerald-200/40">
                        {group.totals.moyenneGte10Pct} %
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-center font-mono font-bold text-amber-950 bg-amber-100">
                        {group.totals.moyenneLt10Count}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-center font-mono font-bold text-amber-900 bg-amber-100/60">
                        {group.totals.moyenneLt10Pct} %
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-center font-mono font-bold text-rose-950 bg-rose-100">
                        {group.totals.moyenneLt65Count}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-center font-mono font-bold text-rose-900 bg-rose-100/60">
                        {group.totals.moyenneLt65Pct} %
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-center font-mono font-bold text-emerald-800">
                        {group.totals.forteMoyenne !== null ? group.totals.forteMoyenne.toFixed(2) : '—'}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-left truncate max-w-[140px] text-[11px] text-slate-800">
                        {group.totals.forteMoyenneEleveNom}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-center font-mono font-bold text-rose-800">
                        {group.totals.faibleMoyenne !== null ? group.totals.faibleMoyenne.toFixed(2) : '—'}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-left truncate max-w-[140px] text-[11px] text-slate-800">
                        {group.totals.faibleMoyenneEleveNom}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-center font-mono font-black text-emerald-950 bg-emerald-200">
                        {group.totals.tauxReussite} %
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-center font-mono font-bold text-slate-900">
                        {group.totals.moyenneClasse !== null ? group.totals.moyenneClasse.toFixed(2) : '—'}
                      </td>
                    </tr>

                    {/* 3. LIGNE TOTAL DU PREMIER CYCLE (Exigence 5 : après toutes les promotions du 1er cycle) */}
                    {totalPremierCycle && groupIdx === lastPremierCyclePromoIndex && (
                      <tr className="bg-emerald-900 text-white font-black text-xs border-y-2 border-emerald-950 shadow-inner">
                        <td className="border border-emerald-950 px-2.5 py-2.5 text-left uppercase tracking-wider font-extrabold text-amber-300">
                          TOTAL PREMIER CYCLE
                        </td>
                        <td className="border border-emerald-950 px-2 py-2 text-center font-mono font-bold">
                          {totalPremierCycle.inscrits}
                        </td>
                        <td className="border border-emerald-950 px-2 py-2 text-center font-mono font-bold text-emerald-200">
                          {totalPremierCycle.presents}
                        </td>
                        <td className="border border-emerald-950 px-2 py-2 text-center font-mono text-emerald-300">
                          {totalPremierCycle.abandons}
                        </td>
                        <td className="border border-emerald-950 px-2 py-2 text-center font-mono font-bold bg-emerald-950">
                          {totalPremierCycle.moyenneGte10Count}
                        </td>
                        <td className="border border-emerald-950 px-2 py-2 text-center font-mono font-bold text-emerald-200 bg-emerald-950/80">
                          {totalPremierCycle.moyenneGte10Pct} %
                        </td>
                        <td className="border border-emerald-950 px-2 py-2 text-center font-mono font-bold bg-amber-950">
                          {totalPremierCycle.moyenneLt10Count}
                        </td>
                        <td className="border border-emerald-950 px-2 py-2 text-center font-mono font-bold text-amber-200 bg-amber-950/80">
                          {totalPremierCycle.moyenneLt10Pct} %
                        </td>
                        <td className="border border-emerald-950 px-2 py-2 text-center font-mono font-bold bg-rose-950">
                          {totalPremierCycle.moyenneLt65Count}
                        </td>
                        <td className="border border-emerald-950 px-2 py-2 text-center font-mono font-bold text-rose-200 bg-rose-950/80">
                          {totalPremierCycle.moyenneLt65Pct} %
                        </td>
                        <td className="border border-emerald-950 px-2 py-2 text-center font-mono font-bold text-emerald-200">
                          {totalPremierCycle.forteMoyenne !== null ? totalPremierCycle.forteMoyenne.toFixed(2) : '—'}
                        </td>
                        <td className="border border-emerald-950 px-2 py-2 text-left truncate max-w-[140px] text-[11px]">
                          {totalPremierCycle.forteMoyenneEleveNom}
                        </td>
                        <td className="border border-emerald-950 px-2 py-2 text-center font-mono font-bold text-rose-200">
                          {totalPremierCycle.faibleMoyenne !== null ? totalPremierCycle.faibleMoyenne.toFixed(2) : '—'}
                        </td>
                        <td className="border border-emerald-950 px-2 py-2 text-left truncate max-w-[140px] text-[11px]">
                          {totalPremierCycle.faibleMoyenneEleveNom}
                        </td>
                        <td className="border border-emerald-950 px-2 py-2 text-center font-mono font-black text-amber-300 bg-emerald-950">
                          {totalPremierCycle.tauxReussite} %
                        </td>
                        <td className="border border-emerald-950 px-2 py-2 text-center font-mono font-bold text-white">
                          {totalPremierCycle.moyenneClasse !== null ? totalPremierCycle.moyenneClasse.toFixed(2) : '—'}
                        </td>
                      </tr>
                    )}

                    {/* 4. LIGNE TOTAL DU SECOND CYCLE (après toutes les promotions du 2nd cycle) */}
                    {totalSecondCycle && groupIdx === lastSecondCyclePromoIndex && (
                      <tr className="bg-purple-950 text-white font-black text-xs border-y-2 border-purple-900 shadow-inner">
                        <td className="border border-purple-900 px-2.5 py-2.5 text-left uppercase tracking-wider font-extrabold text-amber-300">
                          TOTAL SECOND CYCLE
                        </td>
                        <td className="border border-purple-900 px-2 py-2 text-center font-mono font-bold">
                          {totalSecondCycle.inscrits}
                        </td>
                        <td className="border border-purple-900 px-2 py-2 text-center font-mono font-bold text-purple-200">
                          {totalSecondCycle.presents}
                        </td>
                        <td className="border border-purple-900 px-2 py-2 text-center font-mono text-purple-300">
                          {totalSecondCycle.abandons}
                        </td>
                        <td className="border border-purple-900 px-2 py-2 text-center font-mono font-bold bg-purple-900">
                          {totalSecondCycle.moyenneGte10Count}
                        </td>
                        <td className="border border-purple-900 px-2 py-2 text-center font-mono font-bold text-purple-200 bg-purple-900/80">
                          {totalSecondCycle.moyenneGte10Pct} %
                        </td>
                        <td className="border border-purple-900 px-2 py-2 text-center font-mono font-bold bg-amber-950">
                          {totalSecondCycle.moyenneLt10Count}
                        </td>
                        <td className="border border-purple-900 px-2 py-2 text-center font-mono font-bold text-amber-200 bg-amber-950/80">
                          {totalSecondCycle.moyenneLt10Pct} %
                        </td>
                        <td className="border border-purple-900 px-2 py-2 text-center font-mono font-bold bg-rose-950">
                          {totalSecondCycle.moyenneLt65Count}
                        </td>
                        <td className="border border-purple-900 px-2 py-2 text-center font-mono font-bold text-rose-200 bg-rose-950/80">
                          {totalSecondCycle.moyenneLt65Pct} %
                        </td>
                        <td className="border border-purple-900 px-2 py-2 text-center font-mono font-bold text-purple-200">
                          {totalSecondCycle.forteMoyenne !== null ? totalSecondCycle.forteMoyenne.toFixed(2) : '—'}
                        </td>
                        <td className="border border-purple-900 px-2 py-2 text-left truncate max-w-[140px] text-[11px]">
                          {totalSecondCycle.forteMoyenneEleveNom}
                        </td>
                        <td className="border border-purple-900 px-2 py-2 text-center font-mono font-bold text-rose-200">
                          {totalSecondCycle.faibleMoyenne !== null ? totalSecondCycle.faibleMoyenne.toFixed(2) : '—'}
                        </td>
                        <td className="border border-purple-900 px-2 py-2 text-left truncate max-w-[140px] text-[11px]">
                          {totalSecondCycle.faibleMoyenneEleveNom}
                        </td>
                        <td className="border border-purple-900 px-2 py-2 text-center font-mono font-black text-amber-300 bg-purple-900">
                          {totalSecondCycle.tauxReussite} %
                        </td>
                        <td className="border border-purple-900 px-2 py-2 text-center font-mono font-bold text-white">
                          {totalSecondCycle.moyenneClasse !== null ? totalSecondCycle.moyenneClasse.toFixed(2) : '—'}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>

            {/* LIGNE DE TOTALISATION OFFICIELLE DU COLLÈGE */}
            <tfoot>
              <tr className="bg-slate-900 text-white font-black text-center text-[11px] border-t-2 border-slate-950">
                <td className="border border-slate-400 px-2 py-3 text-left uppercase tracking-wider text-amber-400">
                  TOTAL DU COLLÈGE (CEG GOGBO)
                </td>
                <td className="border border-slate-400 px-2 py-3 font-mono font-bold">
                  {currentData.totaux.inscrits}
                </td>
                <td className="border border-slate-400 px-2 py-3 font-mono font-bold text-emerald-300">
                  {currentData.totaux.presents}
                </td>
                <td className="border border-slate-400 px-2 py-3 font-mono text-slate-400">
                  {currentData.totaux.abandons}
                </td>
                {/* M >= 10 effectif */}
                <td className="border border-slate-400 px-2 py-3 font-mono font-bold bg-emerald-900 text-white">
                  {currentData.totaux.moyenneGte10Count}
                </td>
                {/* % */}
                <td className="border border-slate-400 px-2 py-3 font-mono text-emerald-300 bg-emerald-800">
                  {currentData.totaux.moyenneGte10Pct} %
                </td>
                {/* M < 10 effectif */}
                <td className="border border-slate-400 px-2 py-3 font-mono font-bold bg-amber-950 text-white">
                  {currentData.totaux.moyenneLt10Count}
                </td>
                {/* % */}
                <td className="border border-slate-400 px-2 py-3 font-mono text-amber-300 bg-amber-900">
                  {currentData.totaux.moyenneLt10Pct} %
                </td>
                {/* M < 6.5 effectif */}
                <td className="border border-slate-400 px-2 py-3 font-mono font-bold bg-rose-950 text-white">
                  {currentData.totaux.moyenneLt65Count}
                </td>
                {/* % */}
                <td className="border border-slate-400 px-2 py-3 font-mono text-rose-300 bg-rose-900">
                  {currentData.totaux.moyenneLt65Pct} %
                </td>
                {/* Forte moyenne globale */}
                <td className="border border-slate-400 px-2 py-3 font-mono font-bold text-emerald-300">
                  {currentData.totaux.forteMoyenneGlobale !== null ? currentData.totaux.forteMoyenneGlobale.toFixed(2) : '—'}
                </td>
                {/* Major Global */}
                <td className="border border-slate-400 px-2 py-3 text-left font-semibold text-emerald-200 truncate max-w-[140px]">
                  {currentData.totaux.forteMoyenneGlobaleEleve || '—'} {currentData.totaux.forteMoyenneGlobaleClasse ? `(${currentData.totaux.forteMoyenneGlobaleClasse})` : ''}
                </td>
                {/* Faible moyenne globale */}
                <td className="border border-slate-400 px-2 py-3 font-mono font-bold text-rose-300">
                  {currentData.totaux.faibleMoyenneGlobale !== null ? currentData.totaux.faibleMoyenneGlobale.toFixed(2) : '—'}
                </td>
                {/* Dernier Global */}
                <td className="border border-slate-400 px-2 py-3 text-left font-semibold text-rose-200 truncate max-w-[140px]">
                  {currentData.totaux.faibleMoyenneGlobaleEleve || '—'} {currentData.totaux.faibleMoyenneGlobaleClasse ? `(${currentData.totaux.faibleMoyenneGlobaleClasse})` : ''}
                </td>
                {/* Taux Réussite Global */}
                <td className="border border-slate-400 px-2 py-3 font-mono font-black text-amber-300 bg-emerald-950">
                  {currentData.totaux.tauxReussiteGlobal} %
                </td>
                {/* Moyenne Générale Collège */}
                <td className="border border-slate-400 px-2 py-3 font-mono font-bold text-white">
                  {currentData.totaux.moyenneGeneraleCollege !== null ? currentData.totaux.moyenneGeneraleCollege.toFixed(2) : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Note méthodologique officielle Bénin */}
        <div className="text-[11px] text-slate-500 pt-3 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <strong>Méthodologie officielle :</strong> Le taux de réussite est calculé sur l'effectif des présents ayant composé (M ≥ 10). Les pourcentages des promotions et du premier cycle sont recalculés strictement à partir des effectifs cumulés.
          </div>
          <div className="font-mono text-[10px] text-slate-400">
            Document officiel généré le {new Date().toLocaleDateString('fr-FR')} • Session {anneeLibelle}
          </div>
        </div>
      </div>
    </div>
  );
};
