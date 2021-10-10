type SpineItem = {
    path: string,
    moPath: string
};

type Epub = {
    spine: Array<SpineItem>,
    metadata: Object,
    nav: Object,
    basedir: string,
    packageFilename: string,
    navFilename: string,
    favico: string,
    audioFiles: Array<string>
};
