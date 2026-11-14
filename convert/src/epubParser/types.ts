export type MetadataValue = string | string[];

export type Metadata = Record<string, MetadataValue>;

export type SpineItem = {
    path: string;
    moPath: string;
    // The content document's own <title>, used when the nav document gives no title for it
    title?: string;
    // The text of the content document's h1–h6 elements, in document order
    headings?: string[];
};

export type EpubNavMap = Record<string, Element>;

export type EpubParseOptions = {
    includeNonLinear?: boolean;
    warn?: (message: string) => void;
};

export type Epub = {
    spine: SpineItem[];
    metadata: Metadata;
    nav: EpubNavMap;
    basedir: string;
    packageFilename: string;
    navFilename: string;
    coverDocumentHref?: string;
    pageProgression?: 'ltr' | 'rtl';
};
