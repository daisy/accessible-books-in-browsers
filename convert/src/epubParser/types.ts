export type MetadataValue = string | string[];

export type Metadata = Record<string, MetadataValue>;

export type SpineItem = {
    path: string;
    moPath: string;
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
};
