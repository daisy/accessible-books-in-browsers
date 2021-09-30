let template = (
    bookTitle, 
    sectionTitle, 
    contents, 
    previousSectionHref, 
    previousSectionTitle, 
    nextSectionHref, 
    nextSectionTitle, 
    navDocHref, 
    headContents,
    narration,
    favico) =>
`<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="utf-8" />
    <meta name="generatedBy" content="hand" />
    <title>${bookTitle}${sectionTitle ? `: ${sectionTitle}` : ''}</title>
    
    <link rel="stylesheet" type="text/css" href="../../src/styles/theme.css">
    <link rel="stylesheet" type="text/css" href="../../src/styles/layout.css">
    <link rel="stylesheet" type="text/css" href="../../src/styles/collapsible-panel.css">
    <link rel="stylesheet" type="text/css" href="../../src/styles/toolbar.css">
    <link rel="stylesheet" type="text/css" href="../../src/styles/app-toolbar.css">
    <link rel="stylesheet" type="text/css" href="../../src/styles/playback-toolbar.css">
    <link rel="stylesheet" type="text/css" href="../../src/styles/nav-panel.css">
    <link rel="stylesheet" type="text/css" href="../../src/styles/settings-panel.css">
    <link rel="stylesheet" type="text/css" href="../../src/styles/content.css">
    <link rel="stylesheet" type="text/css" href="../../src/styles/nav.css">
    
    ${favico ? 
        `<link rel="icon" type="image/png" sizes="96x96" href="../${favico}">`
        : ``}
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    ${headContents}

    <script>document.documentElement.classList.add('p4w-js');</script>
</head>

<body>
    
    <main>
    ${narration ? 
        `<div id="p4w-audio">
            <p>Listen to this chapter:</p>
            <audio src="${narration.audio}" controls></audio>
        </div>` 
        : ``}
    ${contents}
    </main>
    
 
    
    <nav aria-label="Sections" id="p4w-document-links">
        ${previousSectionHref ? 
        `<a id="p4w-previous-section" href="${previousSectionHref}" title="Previous: ${previousSectionTitle}" class="p4w-lightup">
            <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" 
                class="p4w-iconify iconify--fluent" preserveAspectRatio="xMidYMid meet" 
                viewBox="0 0 24 24" data-icon="fluent:chevron-left-24-filled"
                width="2em" height="2em" >
                <g fill="none">
                    <path d="M15.707 4.293a1 1 0 0 1 0 1.414L9.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414l-7-7a1 1 0 0 1 0-1.414l7-7a1 1 0 0 1 1.414 0z" fill="currentColor">
                    </path>
                </g>
            </svg>
        </a>` : ''}
        ${nextSectionHref ? 
        `<a id="p4w-next-section" href="${nextSectionHref}" title="Next: ${nextSectionTitle}" class="p4w-lightup">
            <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" 
                class="p4w-iconify iconify--fluent" preserveAspectRatio="xMidYMid meet" 
                viewBox="0 0 24 24" data-icon="fluent:chevron-right-24-filled"
                width="2em" height="2em" >
                <g fill="none">
                    <path d="M8.293 4.293a1 1 0 0 0 0 1.414L14.586 12l-6.293 6.293a1 1 0 1 0 1.414 1.414l7-7a1 1 0 0 0 0-1.414l-7-7a1 1 0 0 0-1.414 0z" fill="currentColor">
                    </path>
                </g>
            </svg>
        </a>` : ''}
        <a id="p4w-toc-link" href="${navDocHref}" title="Table of Contents" class="p4w-lightup">
            <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" 
                class="p4w-iconify" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24" width="2em" height="2em">
                <g fill="none">
                    <path d="M3.5 16.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3zm4 .5h13.503a1 1 0 0 1 .117 1.993l-.117.007H7.5a1 1 0 0 1-.116-1.993L7.5 17h13.503H7.5zm-4-6.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3zm4 .5h13.503a1 1 0 0 1 .117 1.993l-.117.007H7.5a1 1 0 0 1-.116-1.993L7.5 11h13.503H7.5zm-4-6.492a1.5 1.5 0 1 1 0 2.999a1.5 1.5 0 0 1 0-3zM7.5 5h13.503a1 1 0 0 1 .117 1.993l-.117.007H7.5a1 1 0 0 1-.116-1.994l.116-.006h13.503H7.5z" fill="currentColor"/>
                </g>
            </svg>
        </a>
        <a id="p4w-about-link" href="../about.html" title="About this publication" class="p4w-lightup">
            <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" 
                class="p4w-iconify iconify--fluent" preserveAspectRatio="xMidYMid meet" 
                viewBox="0 0 24 24" data-icon="fluent:book-information-24-filled" width="2em" height="2em">
                <g fill="none">
                    <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H18a2.5 2.5 0 0 1 2.5 2.5v14.25a.75.75 0 0 1-.75.75H5.5a1 1 0 0 0 1 1h13.25a.75.75 0 0 1 0 1.5H6.5A2.5 2.5 0 0 1 4 19.5v-15zM12.25 8a1 1 0 1 0 0-2a1 1 0 0 0 0 2zm-.75 1.75v5a.75.75 0 0 0 1.5 0v-5a.75.75 0 0 0-1.5 0z" fill="currentColor">
                    </path>
                </g>
            </svg>
        </a>
    </nav>
    
</body>
<script type="module" id="p4w-initApp">
    import { setupUi } from '../../src/js/app.js';

    (async () => {
        await setupUi(${narration ? `"${narration.smil}"` : null});
    })();

</script>
</html>`;

export { template };