// Référentiel statique de la plateforme : niveaux, catégories (axes) et cours.
// Ce module ne contient aucun secret : il peut être importé côté client.

export type Level = 1 | 2 | 3;
export type CatCode = 'SYS' | 'REC' | 'WEB' | 'EXP';

export const LEVELS: Record<Level, { name: string; color: string; dots: string; desc: string }> = {
  1: { name: 'Débutant', color: '#8BD3FF', dots: '●○○', desc: 'Partir de zéro : le terminal, les réseaux, les premiers scans et les premières failles.' },
  2: { name: 'Intermédiaire', color: '#F2C94C', dots: '●●○', desc: 'Énumérer, intercepter, exploiter le web et élever ses privilèges jusqu’à Active Directory.' },
  3: { name: 'Avancé', color: '#FF8A65', dots: '●●●', desc: 'Scénarios complets : cloud, évasion, exploitation mémoire et red team.' },
};
export const LEVEL_IDS: Level[] = [1, 2, 3];

export const CATS: Record<CatCode, { name: string; color: string; icon: string }> = {
  SYS: { name: 'Systèmes & Réseaux', color: '#7C9CFF', icon: 'ph-terminal-window' },
  REC: { name: 'Reconnaissance, Scan & Analyse', color: '#2DD4BF', icon: 'ph-magnifying-glass' },
  WEB: { name: 'Web, BDD & Cryptographie', color: '#E879F9', icon: 'ph-globe-hemisphere-west' },
  EXP: { name: 'Exploitation & Post-exploitation', color: '#FB7185', icon: 'ph-bug' },
};
export const CAT_CODES = Object.keys(CATS) as CatCode[];

export function isLevel(n: number): n is Level {
  return n === 1 || n === 2 || n === 3;
}
export function isCat(c: string): c is CatCode {
  return c in CATS;
}
export function levelLabel(l: Level) {
  return LEVELS[l].dots + ' ' + LEVELS[l].name;
}

// 4 parties × 5 cours par niveau. Le niveau 3 n'est pas encore publié.
const TITLES: Partial<Record<Level, string[]>> = {
  1: ['Linux', 'Permissions', 'Processus', 'Réseau', 'Protocoles', 'OSINT', 'Dorks', 'Corrélation', 'Nmap', 'Wireshark', 'HTTP', 'Exploration', 'SQL', 'Cryptographie', 'Vulnérabilités', 'Exploits', 'Shell', 'Metasploit', 'Post-exploitation', 'Rapport'],
  2: ['Administration', 'Automatisation', 'Durcissement', 'TCP/IP', 'DNS', 'OSINT', 'Nmap', 'Énumération', 'Wireshark', 'tcpdump', 'Injection SQL', 'XSS · CSRF · IDOR', 'Burp Suite', 'Chiffrement', 'Hachage & PKI', 'Méthodologie', 'Privesc Linux', 'Privesc Windows', 'Active Directory', 'Forensics & rapport'],
};
// Noms de fichiers des documents (sans accents), alignés sur l'arborescence des supports.
const FILE_NAMES: Partial<Record<Level, string[]>> = {
  1: ['Linux', 'Permissions', 'Processus', 'Reseau', 'Protocoles', 'OSINT', 'Dorks', 'Correlation', 'Nmap', 'Wireshark', 'HTTP', 'Exploration', 'SQL', 'Cryptographie', 'Vulnerabilites', 'Exploits', 'Shell', 'Metasploit', 'Postexploitation', 'Rapport'],
  2: ['Administration', 'Automatisation', 'Durcissement', 'TCPIP', 'DNS', 'OSINT', 'Nmap', 'Enumeration', 'Wireshark', 'tcpdump', 'SQLi', 'XSS-CSRF-IDOR', 'Burp Suite', 'Chiffrement', 'Hachage-PKI', 'Methodologie', 'Privesc Linux', 'Privesc Windows', 'Active Directory', 'Forensics-Rapport'],
};
export const COURSES_PER_LEVEL = 20;

export function levelAvailable(l: Level) {
  return !!TITLES[l];
}

export type DocKind = 'Preparatoire' | 'Pratique';

const DOCS_BASE = (process.env.NEXT_PUBLIC_DOCS_BASE ?? '/docs').replace(/\/$/, '');

export function legacyDocumentStorageKey(l: Level, k: number, kind: DocKind, ext: 'pdf' | 'dc.html') {
  const p = Math.floor(k / 5) + 1, s = (k % 5) + 1;
  const file = `${l === 2 ? 'N2-' : ''}P${p}-S${s} ${kind} ${FILE_NAMES[l]![k]}.${ext}`;
  return `Niveau ${l}/Partie ${p}/Séance ${s}/${file}`;
}

export function documentHref(storageKey: string) {
  const relativeKey = storageKey.replace(/^\/+/, '').replace(/^docs\//, '');
  return `${DOCS_BASE}/${relativeKey.split('/').map(encodeURIComponent).join('/')}`;
}

/** Lien vers un document de cours, ex. `/docs/Niveau 2/Partie 2/Séance 2/N2-P2-S2 Pratique Nmap.pdf`. */
export function docHref(l: Level, k: number, kind: DocKind, ext: 'pdf' | 'dc.html') {
  return DOCS_BASE + '/' + encodeURI(legacyDocumentStorageKey(l, k, kind, ext));
}

export type Course = {
  level: Level; k: number; num: string; title: string; part: number;
  catCode: CatCode; catIcon: string; catColor: string; levelName: string; href: string;
};

/** k = index 0..19 du cours dans le niveau. */
export function getCourse(l: Level, k: number): Course | null {
  const titles = TITLES[l];
  if (!titles || !Number.isInteger(k) || k < 0 || k >= titles.length) return null;
  const catCode = CAT_CODES[Math.floor(k / 5)], C = CATS[catCode];
  const num = String(k + 1).padStart(2, '0');
  return { level: l, k, num, title: titles[k], part: Math.floor(k / 5) + 1, catCode, catIcon: C.icon, catColor: C.color,
    levelName: LEVELS[l].name, href: `/cours/${l}/${num}` };
}

/** Premier cours de la partie correspondant à une catégorie (lien « Revois le cours » d'un défi). */
export function courseForCategory(l: Level, cat: CatCode) {
  return getCourse(l, CAT_CODES.indexOf(cat) * 5);
}

/** Fond de bannière : trame quadrillée + halo de la couleur donnée. */
export function banner(color: string) {
  return 'linear-gradient(#ffffff0a 1px,transparent 1px) 0 0/18px 18px,linear-gradient(90deg,#ffffff0a 1px,transparent 1px) 0 0/18px 18px,'
    + `radial-gradient(circle at 80% 20%,${color}40,transparent 60%),${color}1A`;
}

export const MEDALS = ['#F2C94C', '#C9D3DC', '#D08B5B'];
