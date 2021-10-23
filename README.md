# accessible-books-on-the-web

[Github project page](https://github.com/daisy/accessible-books-on-the-web)

## About 

Transform EPUB with Media Overlays into a series of HTML files for reading directly on the web. 

A typical conversion creates the following files (see an [example fileset](https://github.com/daisy/accessible-books-on-the-web/tree/main/demos/moby-dick)):
- HTML files with the original contents, plus reading interface controls and links to the TOC, Previous, and Next pages.
- An About page containing publication metainformation
- A TOC based on the original EPUB Nav Document

Media Overlays conversion adds the following:
- Creation of one audio file per HTML page
- Embedding that audio file in the HTML page
- A VTT file containing the phrase timing information for that audio file

## Demos

* [Action for Heroes](https://daisy.github.io/accessible-books-on-the-web/demos/action-for-heroes)
* [Moby Dick](https://daisy.github.io/accessible-books-on-the-web/demos/moby-dick)

These demos were created using this [conversion script](https://github.com/daisy/accessible-books-on-the-web/tree/main/convert). 

## Status

This project is currently a __prototype__. 




## Current features

| Feature | Basic | JS-enhanced |
|---------|-------|-------------|
| Spine navigation | Forward and back through the spine documents with links (shown as arrows) | (same) | 
| TOC | TOC link opens `nav.html`| Loads TOC in sidebar | 
| Page list | Page list is within `nav.html`, use landmarks navigation or click the in-page link at top | Loads in sidebar and has go-to-page controls | 
| Search | Not available | Full text search from sidebar |
| Publication info | Info link opens `about.html`, a generated page containing publication info | Loads in sidebar |
| Keyboard shortcuts | Not available | Available (see help for details) | 
| Help | Opens in new page | (same) |
| Settings | Not available | Change size, theme, playback rate |
| Theme | Match OS dark theme preference by default | Same, plus ability to turn on/off |
| Bookmarks | Bookmark any heading using your browser | (same) |
| Audio support | Play embedded audio for the page with native HTML controls | Synchronized highlighting and custom controls, including phrase navigation and control over announcing page numbers|


## Caveats

### Conversion
A few things (navigation document consistency across publications; colors in stylesheets or things marked `!important`) were adjusted manually in the EPUB source; this is, after all, just a prototype. But these aspects can and will be automated in the future.


### User interface

- Autoplay between chapters is [not working yet](https://github.com/daisy/accessible-books-on-the-web/issues/3)
- Slight flashing on page load if not using dark mode

[See issues list](https://github.com/daisy/accessible-books-on-the-web/issues)
