// ============================================================
//  constants.js — Configurazione e dati statici
// ============================================================

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyFE-GZxhfiGsOfcirkjF4UKURP334ugroveTWwah1b-S2tZCIoIREkuFY82YB7BaPl/exec";

const RARITIES = [
  { id: 'common',    label: 'Comune',      weight: 60, bg: '#3a3a3a', color: '#cccccc', glowColor: 'rgba(136,136,136,0.4)', badgeBg: 'rgba(80,80,80,0.8)',   badgeColor: '#ccc' },
  { id: 'rare',      label: 'Raro',        weight: 25, bg: '#0c447c', color: '#85b7eb', glowColor: 'rgba(55,138,221,0.5)', badgeBg: 'rgba(12,68,124,0.8)',  badgeColor: '#85b7eb' },
  { id: 'epic',      label: 'Epico',       weight: 12, bg: '#3c3489', color: '#afa9ec', glowColor: 'rgba(127,119,221,0.6)', badgeBg: 'rgba(60,52,137,0.8)', badgeColor: '#afa9ec' },
  { id: 'legendary', label: 'Leggendario', weight: 3,  bg: '#633806', color: '#fac775', glowColor: 'rgba(239,159,39,0.7)', badgeBg: 'rgba(99,56,6,0.8)',   badgeColor: '#fac775' },
];

const STRIP_LENGTH = 40;
const WINNER_POS   = 20;
const SEGMENT_W    = 104;
const SEGMENT_GAP  = 4;
const STRIP_TOTAL  = SEGMENT_W + SEGMENT_GAP;
const MAX_RECENT   = 10;
