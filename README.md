# accessible-books-on-the-web

[Github project page](https://github.com/daisy/accessible-books-on-the-web)

## About 

Transform EPUB with Media Overlays into a series of HTML files suitable for reading on the web. The source files are slightly reworked and wrapped in an HTML template. The reading controls are embedded into these HTML files themselves. 

## Demos

* [Action for Heroes](https://daisy.github.io/accessible-books-on-the-web/demos/action-for-heroes)
* [Moby Dick](https://daisy.github.io/accessible-books-on-the-web/demos/moby-dick)

## Status

This project is currently a prototype. The demos were created using the [convert script](https://github.com/daisy/accessible-books-on-the-web/tree/main/convert). These are the [source files for the user interface](https://github.com/daisy/accessible-books-on-the-web/tree/main/demos/src), embedded in each converted file.

Many features are still experimental or on the to-do list (such as mobile layout). Current features are detailed below.

### Caveats

A few things (navigation document consistency across publications; colors in stylesheets or things marked `!important`) were adjusted manually in the EPUB source; this is, after all, just a prototype. But these aspects can and will be automated in the future.

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
| Theme | Match OS dark theme preference by default | Same with ability to turn on/off |
| Bookmarks | Bookmark any heading using your browser | (same) |
| Audio support | Play embedded audio for the page with native HTML controls | Synchronized highlighting and custom controls, including phrase navigation|



