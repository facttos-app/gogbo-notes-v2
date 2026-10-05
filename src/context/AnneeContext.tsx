import React, { createContext, useContext, useState, useEffect } from 'react';
import { AnneeScolaire } from '../types';
import { storage } from '../lib/storage';
import { OFFICIAL_ANNEES_SCOLAIRES } from '../lib/constants';

interface AnneeContextType {
  annees: AnneeScolaire[];
  allAnnees: AnneeScolaire[];
  activeAnnee: AnneeScolaire;
  selectedAnnee: AnneeScolaire;
  isArchive: boolean;
  isViewingArchived: boolean;
  isViewingFuture: boolean;
  setSelectedAnnee: (annee: AnneeScolaire) => void;
  setSelectedAnneeByLibelle: (libelle: string) => void;
  changerAnneeActive: (anneeId: string) => void;
  refreshAnnees: () => void;
}

const AnneeContext = createContext<AnneeContextType | undefined>(undefined);

const SELECTED_ANNEE_STORAGE_KEY = 'gogbo_v2_selected_annee_id';

const defaultFallbackAnnee: AnneeScolaire = OFFICIAL_ANNEES_SCOLAIRES[1] || {
  id: 'annee-2026-2027',
  libelle: '2026–2027',
  date_debut: '2026-09-15',
  date_fin: '2027-06-30',
  is_active: true,
  statut: 'EN_COURS',
  created_at: '2026-08-01T08:00:00Z',
};

const getSafeActiveAnnee = (): AnneeScolaire => {
  try {
    const a = storage.getActiveAnneeScolaire();
    if (a && a.libelle) return a;
  } catch (e) {
    console.warn('Error reading active annee:', e);
  }
  return defaultFallbackAnnee;
};

export const AnneeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [annees, setAnnees] = useState<AnneeScolaire[]>([]);
  const [activeAnnee, setActiveAnnee] = useState<AnneeScolaire>(getSafeActiveAnnee);
  const [selectedAnnee, setSelectedAnneeState] = useState<AnneeScolaire>(getSafeActiveAnnee);

  const refreshAnnees = () => {
    try {
      const list = storage.getAnneesScolaires();
      const safeList = Array.isArray(list) && list.length > 0 ? list : OFFICIAL_ANNEES_SCOLAIRES;
      setAnnees(safeList);
      const active = storage.getActiveAnneeScolaire() || defaultFallbackAnnee;
      setActiveAnnee(active);

      const savedId = storage.rawGet(SELECTED_ANNEE_STORAGE_KEY);
      const found = safeList.find((a) => a.id === savedId) || active || safeList[0] || defaultFallbackAnnee;
      if (found) {
        setSelectedAnneeState(found);
      }
    } catch (e) {
      console.warn('refreshAnnees notice:', e);
    }
  };

  useEffect(() => {
    refreshAnnees();
  }, []);

  const setSelectedAnnee = (annee: AnneeScolaire) => {
    setSelectedAnneeState(annee);
    storage.rawSet(SELECTED_ANNEE_STORAGE_KEY, annee.id);
  };

  const setSelectedAnneeByLibelle = (libelle: string) => {
    const list = storage.getAnneesScolaires();
    const found = list.find((a) => a.libelle === libelle);
    if (found) {
      setSelectedAnnee(found);
    }
  };

  const changerAnneeActive = (anneeId: string) => {
    const user = storage.getProfiles().find((p) => p.role === 'CENSEUR') || storage.getProfiles()[0];
    const activated = storage.setActiveAnneeScolaire(anneeId, user);
    refreshAnnees();
    setSelectedAnnee(activated);
  };

  const isArchive = selectedAnnee?.statut === 'CLOTUREE' || (!selectedAnnee?.is_active && new Date(selectedAnnee?.date_fin || '').getTime() < Date.now());
  const isViewingFuture = selectedAnnee?.statut === 'A_VENIR';

  return (
    <AnneeContext.Provider
      value={{
        annees,
        allAnnees: annees,
        activeAnnee,
        selectedAnnee,
        isArchive,
        isViewingArchived: isArchive,
        isViewingFuture,
        setSelectedAnnee,
        setSelectedAnneeByLibelle,
        changerAnneeActive,
        refreshAnnees,
      }}
    >
      {children}
    </AnneeContext.Provider>
  );
};

export const useAnnee = () => {
  const context = useContext(AnneeContext);
  if (!context) {
    throw new Error('useAnnee must be used within an AnneeProvider');
  }
  return context;
};
