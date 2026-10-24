// Génération d'un classeur Excel (.xlsx) sans dépendance externe.
// Un .xlsx est une archive ZIP de fichiers XML ; on écrit ici une archive « stockée » (sans compression).

export type CelluleXlsx = string | number | null | undefined;

export interface FeuilleXlsx {
  nom: string;
  lignes: CelluleXlsx[][]; // la première ligne est l'en-tête (affichée en gras)
  largeurs?: number[];
}

const encoder = new TextEncoder();

function echapperXml(valeur: string): string {
  return valeur
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nomFeuilleValide(nom: string, utilises: Set<string>): string {
  let base = nom.replace(/[\[\]:*?/\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 31) || 'Feuille';
  let candidat = base;
  let n = 2;
  while (utilises.has(candidat.toLowerCase())) {
    const suffixe = ` ${n}`;
    candidat = base.slice(0, 31 - suffixe.length) + suffixe;
    n += 1;
  }
  utilises.add(candidat.toLowerCase());
  return candidat;
}

function lettreColonne(index: number): string {
  let s = '';
  let n = index + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function xmlFeuille(feuille: FeuilleXlsx): string {
  const nbColonnes = Math.max(1, ...feuille.lignes.map((l) => l.length));
  let cols = '';
  if (feuille.largeurs && feuille.largeurs.length > 0) {
    cols =
      '<cols>' +
      feuille.largeurs
        .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
        .join('') +
      '</cols>';
  }
  const lignesXml = feuille.lignes
    .map((ligne, r) => {
      const cellules = ligne
        .map((valeur, c) => {
          if (valeur === null || valeur === undefined || valeur === '') return '';
          const ref = `${lettreColonne(c)}${r + 1}`;
          const style = r === 0 ? ' s="1"' : '';
          if (typeof valeur === 'number' && Number.isFinite(valeur)) {
            return `<c r="${ref}"${style}><v>${valeur}</v></c>`;
          }
          return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${echapperXml(String(valeur))}</t></is></c>`;
        })
        .join('');
      return `<row r="${r + 1}">${cellules}</row>`;
    })
    .join('');
  const derniere = `${lettreColonne(nbColonnes - 1)}${Math.max(1, feuille.lignes.length)}`;
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<dimension ref="A1:${derniere}"/>` +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    cols +
    `<sheetData>${lignesXml}</sheetData>` +
    '</worksheet>'
  );
}

// --- Archive ZIP (méthode « stored ») ---
let tableCrc: Uint32Array | null = null;
function crc32(data: Uint8Array): number {
  if (!tableCrc) {
    tableCrc = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      tableCrc[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = tableCrc[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function creerZip(fichiers: { nom: string; contenu: Uint8Array }[]): Uint8Array {
  const parties: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const dosTime = (12 << 11) | (0 << 5) | 0; // 12:00:00
  const dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1; // 01/01/2026 (valeur fixe)

  for (const f of fichiers) {
    const nom = encoder.encode(f.nom);
    const crc = crc32(f.contenu);
    const taille = f.contenu.length;

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint16(8, 0, true);
    local.setUint16(10, dosTime, true);
    local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, taille, true);
    local.setUint32(22, taille, true);
    local.setUint16(26, nom.length, true);
    local.setUint16(28, 0, true);
    parties.push(new Uint8Array(local.buffer), nom, f.contenu);

    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint16(8, 0x0800, true);
    cd.setUint16(10, 0, true);
    cd.setUint16(12, dosTime, true);
    cd.setUint16(14, dosDate, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, taille, true);
    cd.setUint32(24, taille, true);
    cd.setUint16(28, nom.length, true);
    cd.setUint16(30, 0, true);
    cd.setUint16(32, 0, true);
    cd.setUint16(34, 0, true);
    cd.setUint16(36, 0, true);
    cd.setUint32(38, 0, true);
    cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), nom);

    offset += 30 + nom.length + taille;
  }

  const tailleCentral = central.reduce((s, p) => s + p.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(4, 0, true);
  fin.setUint16(6, 0, true);
  fin.setUint16(8, fichiers.length, true);
  fin.setUint16(10, fichiers.length, true);
  fin.setUint32(12, tailleCentral, true);
  fin.setUint32(16, offset, true);
  fin.setUint16(20, 0, true);

  const tout = [...parties, ...central, new Uint8Array(fin.buffer)];
  const total = tout.reduce((s, p) => s + p.length, 0);
  const resultat = new Uint8Array(total);
  let pos = 0;
  for (const p of tout) {
    resultat.set(p, pos);
    pos += p.length;
  }
  return resultat;
}

export function genererXlsx(feuilles: FeuilleXlsx[]): Uint8Array {
  const liste = feuilles.length > 0 ? feuilles : [{ nom: 'Feuille', lignes: [['']] }];
  const utilises = new Set<string>();
  const noms = liste.map((f) => nomFeuilleValide(f.nom, utilises));

  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    liste
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
      )
      .join('') +
    '</Types>';

  const rels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>';

  const workbook =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets>' +
    noms.map((n, i) => `<sheet name="${echapperXml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
    '</sheets></workbook>';

  const workbookRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    liste
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
      )
      .join('') +
    `<Relationship Id="rId${liste.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    '</Relationships>';

  const styles =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    '</styleSheet>';

  const fichiers = [
    { nom: '[Content_Types].xml', contenu: encoder.encode(contentTypes) },
    { nom: '_rels/.rels', contenu: encoder.encode(rels) },
    { nom: 'xl/workbook.xml', contenu: encoder.encode(workbook) },
    { nom: 'xl/_rels/workbook.xml.rels', contenu: encoder.encode(workbookRels) },
    { nom: 'xl/styles.xml', contenu: encoder.encode(styles) },
    ...liste.map((f, i) => ({ nom: `xl/worksheets/sheet${i + 1}.xml`, contenu: encoder.encode(xmlFeuille(f)) })),
  ];
  return creerZip(fichiers);
}

export function genererZipDeFichiers(fichiers: { nom: string; contenu: Uint8Array }[]): Uint8Array {
  return creerZip(fichiers);
}

function declencherTelechargement(octets: Uint8Array, type: string, nomFichier: string): void {
  const blob = new Blob([octets as BlobPart], { type });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function telechargerZip(nomFichier: string, fichiers: { nom: string; contenu: Uint8Array }[]): void {
  declencherTelechargement(creerZip(fichiers), 'application/zip', nomFichier);
}

export function telechargerXlsx(nomFichier: string, feuilles: FeuilleXlsx[]): void {
  const octets = genererXlsx(feuilles);
  const blob = new Blob([octets as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
