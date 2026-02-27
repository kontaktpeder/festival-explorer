// ─── Mappe‑tre for festivalfilbank ─────────────────────────────────

export type FolderNode = {
  label: string;
  value: string;
  children?: FolderNode[];
};

export const UNSTRUCTURED_FOLDER = "UNSTRUCTURED";
export const ALL_FOLDERS = "ALL";

export const FESTIVAL_FOLDERS: FolderNode[] = [
  {
    label: "Kontrakter",
    value: "Kontrakter",
    children: [
      { label: "Signert", value: "Kontrakter/Signert" },
      { label: "Ikke signert", value: "Kontrakter/Ikke signert" },
    ],
  },
  {
    label: "Bilder",
    value: "Bilder",
    children: [
      { label: "Sosiale medier", value: "Bilder/Sosiale medier" },
      { label: "Andre", value: "Bilder/Andre" },
    ],
  },
  {
    label: "Videoer",
    value: "Videoer",
    children: [
      { label: "Sosiale medier", value: "Videoer/Sosiale medier" },
      { label: "Andre", value: "Videoer/Andre" },
    ],
  },
  {
    label: "Lyd",
    value: "Lyd",
    children: [{ label: "Forslag", value: "Lyd/Forslag" }],
  },
  {
    label: "Dokumenter",
    value: "Dokumenter",
    children: [{ label: "Diverse", value: "Dokumenter/Diverse" }],
  },
];

export type FolderSelection = typeof ALL_FOLDERS | typeof UNSTRUCTURED_FOLDER | string;

function flattenLeafFolders(nodes: FolderNode[]): { label: string; value: string }[] {
  const acc: { label: string; value: string }[] = [];
  const walk = (n: FolderNode) => {
    if (n.children && n.children.length > 0) {
      n.children.forEach(walk);
    } else {
      acc.push({ label: n.label, value: n.value });
    }
  };
  nodes.forEach(walk);
  return acc;
}

export const LEAF_FOLDERS = flattenLeafFolders(FESTIVAL_FOLDERS);

export function folderMatches(itemFolder: string | null, selected: FolderSelection): boolean {
  if (selected === ALL_FOLDERS) return true;
  if (selected === UNSTRUCTURED_FOLDER) return !itemFolder;
  if (!itemFolder) return false;

  const isParent =
    FESTIVAL_FOLDERS.some((n) => n.value === selected) &&
    !LEAF_FOLDERS.some((l) => l.value === selected);

  if (isParent) {
    return itemFolder === selected || itemFolder.startsWith(`${selected}/`);
  }

  return itemFolder === selected;
}

export function deriveIsSigned(folderPath: string | null, fileType: string): boolean | null {
  if (!folderPath || fileType !== "document") return null;
  if (!folderPath.startsWith("Kontrakter/")) return null;
  if (folderPath === "Kontrakter/Signert") return true;
  if (folderPath === "Kontrakter/Ikke signert") return false;
  return null;
}

export function getDefaultFolderForFileType(fileType: string): string {
  switch (fileType) {
    case "document":
      return "Dokumenter/Diverse";
    case "image":
      return "Bilder/Andre";
    case "video":
      return "Videoer/Andre";
    case "audio":
      return "Lyd/Forslag";
    default:
      return "Dokumenter/Diverse";
  }
}
