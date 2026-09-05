function template (
    {
        bodyContents, 
        headContents,
        previousSectionHref, 
        previousSectionTitle, 
        nextSectionHref, 
        nextSectionTitle, 
        navDocHref, 
        vttSrc,
        audioSrc,
        favicoHref,
        aboutHref,
        pathToSharedClientCode,
        searchIndexSrc,
        searchDataSrc
    }) {

return `<!DOCTYPE html>
<html lang="en">
<head>
    ${headContents}
    <link rel="stylesheet" type="text/css" href="${pathToSharedClientCode}/styles/theme.css">
    <link rel="stylesheet" type="text/css" href="${pathToSharedClientCode}/styles/layout.css">
    <link rel="stylesheet" type="text/css" href="${pathToSharedClientCode}/styles/collapsible-panel.css">
    <link rel="stylesheet" type="text/css" href="${pathToSharedClientCode}/styles/toolbar.css">
    <link rel="stylesheet" type="text/css" href="${pathToSharedClientCode}/styles/playback-toolbar.css">
    <link rel="stylesheet" type="text/css" href="${pathToSharedClientCode}/styles/nav-panel.css">
    <link rel="stylesheet" type="text/css" href="${pathToSharedClientCode}/styles/settings-panel.css">
    <link rel="stylesheet" type="text/css" href="${pathToSharedClientCode}/styles/content.css">
    <link rel="stylesheet" type="text/css" href="${pathToSharedClientCode}/styles/nav.css">
    
    ${favicoHref ? 
        `<link rel="icon" type="image/png" sizes="96x96" href="${favicoHref}">`
        : ``}
    ${audioSrc ? 
        `<link rel="alternate" href="#abinb-audio" type="audio/mpeg">`
        : ``}
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script>document.documentElement.classList.add('abinb-js');</script>
</head>

<body class="center">
    <div class="abinb-toolbar-wrapper" id="abinb-top-toolbar-area">
        <section id="abinb-nav-toolbar" class="abinb-toolbar" aria-label="Navigation Sidebar">
            <a id="abinb-toc-link" href="${navDocHref}" title="Table of Contents" class="abinb-lightup">
                <svg aria-hidden="true" role="img" 
                    class="abinb-iconify" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24" width="2em" height="2em">
                    <g fill="none">
                        <path d="M3.5 16.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3zm4 .5h13.503a1 1 0 0 1 .117 1.993l-.117.007H7.5a1 1 0 0 1-.116-1.993L7.5 17h13.503H7.5zm-4-6.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 0 1 0-3zm4 .5h13.503a1 1 0 0 1 .117 1.993l-.117.007H7.5a1 1 0 0 1-.116-1.993L7.5 11h13.503H7.5zm-4-6.492a1.5 1.5 0 1 1 0 2.999a1.5 1.5 0 0 1 0-3zM7.5 5h13.503a1 1 0 0 1 .117 1.993l-.117.007H7.5a1 1 0 0 1-.116-1.994l.116-.006h13.503H7.5z" fill="currentColor"/>
                    </g>
                </svg>
            </a>
            <a id="abinb-about-link" href="${aboutHref}" title="About this publication" class="abinb-lightup">
                <svg aria-hidden="true" role="img" 
                    class="abinb-iconify iconify--fluent" preserveAspectRatio="xMidYMid meet" 
                    viewBox="0 0 24 24" data-icon="fluent:book-information-24-filled" width="2em" height="2em">
                    <g fill="none">
                        <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H18a2.5 2.5 0 0 1 2.5 2.5v14.25a.75.75 0 0 1-.75.75H5.5a1 1 0 0 0 1 1h13.25a.75.75 0 0 1 0 1.5H6.5A2.5 2.5 0 0 1 4 19.5v-15zM12.25 8a1 1 0 1 0 0-2a1 1 0 0 0 0 2zm-.75 1.75v5a.75.75 0 0 0 1.5 0v-5a.75.75 0 0 0-1.5 0z" fill="currentColor">
                        </path>
                    </g>
                </svg>
            </a>
        </section>
        <section id="abinb-app-toolbar" class="abinb-toolbar" aria-label="Application toolbar">
            <div id="abinb-help" class="abinb-lightup">
                <a href="${pathToSharedClientCode}/help/" title="View help" target="_blank" rel="help">
                    <svg aria-hidden="true" role="img" class="abinb-iconify" preserveAspectRatio="xMidYMid meet" viewBox="0 0 24 24" width="2em" height="2em" >
                        <g fill="none">
                            <path d="M12 2c5.523 0 10 4.478 10 10s-4.477 10-10 10S2 17.522 2 12S6.477 2 12 2zm0 13.5a1 1 0 1 0 0 2a1 1 0 0 0 0-2zm0-8.75A2.75 2.75 0 0 0 9.25 9.5a.75.75 0 0 0 1.493.102l.007-.102a1.25 1.25 0 1 1 2.5 0c0 .539-.135.805-.645 1.332l-.135.138c-.878.878-1.22 1.447-1.22 2.53a.75.75 0 0 0 1.5 0c0-.539.135-.805.645-1.332l.135-.138c.878-.878 1.22-1.447 1.22-2.53A2.75 2.75 0 0 0 12 6.75z" fill="currentColor"></path>
                        </g>
                    </svg>
                </a>
            </div>
        </section>
    </div>

    <main>
    ${bodyContents}
    </main>
 
    <div class="abinb-toolbar-wrapper" id="abinb-bottom-toolbar-area">
        ${audioSrc ? 
            `<section id="abinb-playback-toolbar" class="abinb-toolbar" aria-label="Playback toolbar">        
                <audio src="${audioSrc}" controls id="abinb-audio">
                    <track default kind="metadata" src="${vttSrc}">
                </audio>
            </section>`
            : ``
        }
        ${previousSectionHref || nextSectionHref ? 
        `<section role="contentinfo" aria-label="Previous and next links" id="abinb-document-links" class="abinb-toolbar">
            ${previousSectionHref ? 
            `<a id="abinb-previous-section" href="${previousSectionHref}" title="Previous: ${previousSectionTitle}" class="abinb-lightup" rel="prev">
                <svg aria-hidden="true" role="img" 
                    class="abinb-iconify iconify--fluent" preserveAspectRatio="xMidYMid meet" 
                    viewBox="0 0 24 24" data-icon="fluent:chevron-left-24-filled"
                    width="2em" height="2em" >
                    <g fill="none">
                        <path d="M15.707 4.293a1 1 0 0 1 0 1.414L9.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414l-7-7a1 1 0 0 1 0-1.414l7-7a1 1 0 0 1 1.414 0z" fill="currentColor">
                        </path>
                    </g>
                </svg>
            </a>` : ''}
            ${nextSectionHref ? 
            `<a id="abinb-next-section" href="${nextSectionHref}" title="Next: ${nextSectionTitle}" class="abinb-lightup" rel="next">
                <svg aria-hidden="true" role="img" 
                    class="abinb-iconify iconify--fluent" preserveAspectRatio="xMidYMid meet" 
                    viewBox="0 0 24 24" data-icon="fluent:chevron-right-24-filled"
                    width="2em" height="2em" >
                    <g fill="none">
                        <path d="M8.293 4.293a1 1 0 0 0 0 1.414L14.586 12l-6.293 6.293a1 1 0 1 0 1.414 1.414l7-7a1 1 0 0 0 0-1.414l-7-7a1 1 0 0 0-1.414 0z" fill="currentColor">
                        </path>
                    </g>
                </svg>
            </a>` : ''}
        </section>` : ''}
    </div>
    
    <script type="module" id="abinb-initApp">
        import { setupUi } from '${pathToSharedClientCode}/js/app.js';

        (async () => {
            try {
                // TODO parameterize this path
                let searchIndex = new URL('${searchIndexSrc}', document.location);
                let searchData = new URL('${searchDataSrc}', document.location);
                await setupUi(
                        searchIndex,
                        searchData
                    );
            }
            catch(err) {
                console.error(err);
            }
            finally {
                document.documentElement.classList.remove("abinb-js"); 
            }
        })();

    </script>
</body>
</html>`;
}
export { template };