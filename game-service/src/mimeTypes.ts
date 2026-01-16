/**
 * MIME type mappings from Flashpoint proxySettings.json
 * Includes 199 custom MIME types for legacy web content
 */

export const CUSTOM_MIME_TYPES: { [key: string]: string } = {
  // Legacy multimedia formats
  aab: 'application/x-authorware-bin',
  aam: 'application/x-authorware-map',
  aas: 'application/x-authorware-seg',
  afl: 'video/animaflex',
  aif: 'audio/aiff',
  aifc: 'audio/aiff',
  aiff: 'audio/aiff',
  asd: 'application/astound',
  asmx: 'text/xml',
  asn: 'application/astound',
  au: 'audio/basic',
  aut: 'application/pbautomation',
  aw3: 'application/x-awingsoft-winds3d',
  axs: 'application/x-MindAvenueAXELStream',

  // 3D and modeling formats
  blend: 'application/x-burster',
  blendz: 'application/x-burster',
  blz: 'video/blz',
  bswrl: 'application/x-bscontact',
  bub: 'application/photobubble',
  bxwrl: 'application/x-blaxxuncc3d',

  // Director and Shockwave
  ccn: 'application/x-cnc',
  cct: 'application/x-director',
  cnc: 'application/x-cnc',
  cst: 'application/x-director',
  cxt: 'application/x-director',
  dcr: 'application/x-director',
  dir: 'application/x-director',
  dxr: 'application/x-director',
  swa: 'application/x-director',
  w3d: 'application/x-director',

  // Chemical and scientific formats
  cdx: 'chemical/x-cdx',
  chm: 'chemical/x-chemdraw',
  cow: 'chemical/x-cow',
  csm: 'chemical/x-csml',
  csml: 'chemical/x-csml',
  cub: 'chemical/x-gaussian-cube',
  cube: 'chemical/x-gaussian-cube',
  dx: 'chemical/x-jcamp-dx',
  emb: 'chemical/x-pdb',
  embl: 'chemical/x-pdb',
  gau: 'chemical/x-gaussian-input',
  jdx: 'chemical/x-jcamp-dx',
  mol: 'chemical/x-mdl-molfile',
  mop: 'chemical/x-mopac-input',
  pdb: 'chemical/x-pdb',
  rxn: 'chemical/x-mdl-rxnfile',
  skc: 'chemical/x-mdl-tgf',
  tgf: 'chemical/x-mdl-tgf',
  xyz: 'chemical/x-xyz',

  // Image formats
  cgm: 'image/cgm',
  cit: 'image/cit',
  dgn: 'image/dgn',
  djvu: 'image/vnd.djvu',
  fh4: 'image/x-freehand4',
  fh5: 'image/x-freehand5',
  fh7: 'image/x-freehand7',
  fhc: 'image/x-freehand',
  jp2: 'image/jp2',
  jp2k: 'image/jp2',
  mcf: 'image/vasa',
  qdgx: 'image/x-qdgx',
  rle: 'image/rle',
  svg: 'image/svg+xml',
  svgz: 'image/svg+xml',
  twf: 'image/x-twf',
  twfz: 'image/x-twf-zlib-compressed',
  vec: 'image/vec',

  // Audio formats
  it: 'audio/it',
  itz: 'audio/x-zipped-it',
  mdz: 'audio/x-zipped-mod',
  med: 'audio/x-mod',
  mid: 'audio/mid',
  midi: 'audio/midi',
  mod: 'audio/mod',
  s3m: 'audio/s3m',
  s3z: 'audio/x-mod',
  sid: 'audio/x-sidtune',
  wav: 'audio/wav',
  xm: 'audio/xm',
  xmz: 'audio/x-mod',

  // Video formats
  mov: 'video/quicktime',

  // Application formats
  class: 'application/java',
  cmo: 'application/x-virtools',
  co: 'application/x-cult3d-object',
  css: 'text/css',
  deepv: 'application/x-deepv',
  dpg: 'application/vnd.dpgraph',
  dpgraph: 'application/vnd.dpgraph',
  dsn: 'application/x-altiadsn',
  dvl: 'application/x-devalvrx',
  elec: 'application/x-electrifier',
  eva: 'application/x-eva',
  evy: 'application/envoy',

  // Compressed formats
  gz: 'application/x-gzip-compressed',
  wrz: 'application/x-gzip-compressed',
  x3dz: 'application/x-gzip-compressed',

  // Web formats
  htm: 'text/html',
  html: 'text/html',
  js: 'text/javascript',
  mjs: 'text/javascript',
  json: 'application/json',
  xml: 'application/xml',

  // Plugin formats
  ips: 'application/x-ipscript',
  ipx: 'application/x-ipix',
  jar: 'application/java-archive',
  mwc: 'application/vnd.dpgraph',
  mwf: 'application/x-mwf',
  nmo: 'application/x-virtools',
  nms: 'application/x-virtools',
  p3d: 'application/x-p3d',
  pqf: 'application/x-cprplayer',
  pqi: 'application/cprplayer',
  pw3: 'application/x-pulse-player-32',
  pwc: 'application/x-pulse-player',
  pwn: 'application/x-pulse-download',
  pws: 'application/x-pulse-stream',
  sca: 'application/x-supercard',
  scr: 'application/x-rasmol',
  smp: 'application/studiom',
  spl: 'application/futuresplash',
  sts: 'application/x-squeak-source',
  swf: 'application/x-shockwave-flash',
  tbk: 'application/toolbook',
  tcl: 'application/x-tcl',
  thp: 'plugin/x-theorist',
  tv: 'application/x-alambik-script',
  tvb: 'application/x-alambik-script',
  tvd: 'application/x-alambik-script',
  tvs: 'application/x-alambik-script',
  tvv: 'application/x-alambik-script',
  unity3d: 'application/vnd.unity',
  vmo: 'application/x-virtools',
  vobj: 'application/x-netscape-vae-plugin-vae',
  wasm: 'application/wasm',
  web: 'application/vnd.xara',
  xap: 'application/x-silverlight-app',
  xar: 'application/vnd.xara',
  xpg: 'text/x-xpg',

  // World/3D formats
  d96: 'x-world/x-d96',
  dae: 'model/x-bs-collada+xml',
  mus: 'x-world/x-d96',
  rbs: 'x-world/realibase',
  svf: 'vector/x-svf',
  svr: 'x-world/x-svr',
  vrt: 'x-world/x-vrt',
  wrl: 'model/vrml',
  wvr: 'x-world/x-wvr',
  x3db: 'model/x3d+binary',
  xvr: 'x-world/x-xvr'
};

// Standard MIME types for common web files
const STANDARD_MIME_TYPES: { [key: string]: string } = {
  // Text
  txt: 'text/plain',
  css: 'text/css',
  csv: 'text/csv',

  // Images
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  webp: 'image/webp',

  // Audio
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',

  // Video
  mp4: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  avi: 'video/x-msvideo',

  // Fonts
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
  eot: 'application/vnd.ms-fontobject',

  // Archives
  zip: 'application/zip',
  rar: 'application/x-rar-compressed',
  '7z': 'application/x-7z-compressed',
  tar: 'application/x-tar',

  // Documents
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // Binary
  bin: 'application/octet-stream',
  exe: 'application/octet-stream',
  dll: 'application/octet-stream'
};

/**
 * Get MIME type for a file extension
 * Checks custom Flashpoint MIME types first, then standard types
 */
export function getMimeType(extension: string): string {
  const ext = extension.toLowerCase();

  // Check custom MIME types first (priority for legacy content)
  if (CUSTOM_MIME_TYPES[ext]) {
    return CUSTOM_MIME_TYPES[ext];
  }

  // Check standard MIME types
  if (STANDARD_MIME_TYPES[ext]) {
    return STANDARD_MIME_TYPES[ext];
  }

  // Default to octet-stream for unknown types
  return 'application/octet-stream';
}

/**
 * Check if a file extension is a gzipped type
 */
export function isGzippedType(extension: string): boolean {
  const gzippedTypes = ['svgz'];
  return gzippedTypes.includes(extension.toLowerCase());
}

/**
 * Check if a file extension is a script type
 */
export function isScriptType(extension: string): boolean {
  const scriptTypes = ['php', 'php5', 'phtml', 'pl'];
  return scriptTypes.includes(extension.toLowerCase());
}

/**
 * Get list of index file types
 */
export function getIndexFileTypes(): string[] {
  return ['html', 'htm', 'php', 'php5', 'phtml', 'asp', 'aspx', 'jsp', 'jspx'];
}
